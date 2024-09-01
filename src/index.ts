import { serve } from "@hono/node-server";
import { prometheus } from "@hono/prometheus";
import { zValidator as validator } from "@hono/zod-validator";
import * as argon from "@node-rs/argon2";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { etag } from "hono/etag";
import { jwt, verify } from "hono/jwt";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { StatusCodes as httpStatus } from "http-status-codes";
import { z } from "zod";

import config from "./config/config.js";
import {
  sendResetEmail,
  sendVerifyEmail
} from "./services/email.js";
import {
  createUser,
  getUser,
  updateUserPassword,
  validateUserEmail
} from "./services/user.js";

import {
  checkRefreshToken,
  checkUserEmail,
  createEmailVerificationToken,
  createResetToken,
  deleteRefreshToken,
  getEmailVerificationToken,
  getExistingVerificationToken,
  getResetToken,
  purgeEmailVerificationTokens,
  purgeRefreshTokens,
  purgeResetToken,
  saveRefreshToken
} from "./services/auth.js";
import { createAccessToken, createRefreshToken } from "./services/token.js";

const LoginRequest = z.object({
  email: z.string(),
  password: z.string(),
});

const SignUpRequest = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password != confirmPassword) ctx.addIssue({
    code: "custom",
    message: "The password did not match",
    path: ["confirmPassword"],
  });
});

const { printMetrics, registerMetrics } = prometheus();

const app = new Hono();
app.use(etag(), logger(), prettyJSON());
app.use("*", requestId());
app.use("/protected/*", jwt({ secret: config.jwt.access_token.secret }));
app.use("*", registerMetrics);

app.get("/metrics", printMetrics);

app.get("/protected/ident", async (c) => {
  const payload = c.get("jwtPayload");
  return c.json(payload);
});

app.post("/auth/signup", validator("json", SignUpRequest), async (c) => {
  const data = c.req.valid("json");
  const exists = await checkUserEmail(data.email)
  if (exists) return c.json({ success: false }, httpStatus.CONFLICT);

  try {
    const hashedPassword = await argon.hash(data.password);
    const user = await createUser(data.username, data.email, hashedPassword);
    const verification = await createEmailVerificationToken(user.id);
    sendVerifyEmail(user.email, verification.token);
    return c.json({ success: true }, httpStatus.CREATED);
  } catch (error) {
    console.error(error);
    return c.status(httpStatus.INTERNAL_SERVER_ERROR);
  }
});

app.post("/auth/login", validator("json", LoginRequest), async (c) => {
  const data = c.req.valid("json");
  const user = await getUser(data.email);
  if (!user) return c.json(httpStatus.FORBIDDEN);
  if (!user.emailVerified) return c.json({
    message: "You must verify your email address before you can log in.",
  }, httpStatus.FORBIDDEN);

  try {
    if (await argon.verify(user.password, data.password)) {

      const tokenFromCookie = getCookie(
        c,
        config.jwt.refresh_token.cookie_name
      );

      if (tokenFromCookie) {
        const refreshToken = await checkRefreshToken(tokenFromCookie);
        if (!refreshToken || refreshToken.userId != user.id) {
          await purgeRefreshTokens(user.id);
        } else {
          await deleteRefreshToken(tokenFromCookie);
        }

        deleteCookie(c, config.jwt.refresh_token.cookie_name, {
          httpOnly: true,
          sameSite: "none",
          secure: true,
        });
      }

      const [
        accessToken,
        refreshToken,
      ] = await Promise.all([
        createAccessToken(user.id),
        createRefreshToken(user.id),
      ]);

      await saveRefreshToken(refreshToken, user.id);

      setCookie(
        c,
        config.jwt.refresh_token.cookie_name,
        refreshToken,
        {
          httpOnly: true,
          sameSite: "none",
          secure: true,
          maxAge: 24 * 3600
        }
      )

      return c.json({ success: true, accessToken });
    } else {
      return c.json({ success: false }, httpStatus.UNAUTHORIZED);
    }
  } catch (error) {
    console.log(error)
    return c.json({ success: false }, httpStatus.INTERNAL_SERVER_ERROR);
  }
});

app.post("/auth/logout", async (c) => {
  const tokenFromCookie = getCookie(
    c,
    config.jwt.refresh_token.cookie_name
  );

  if (!tokenFromCookie) return c.json({ success: true }, httpStatus.NO_CONTENT);
  const refreshToken = checkRefreshToken(tokenFromCookie);
  if (!refreshToken) {
    deleteCookie(c, config.jwt.refresh_token.cookie_name, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    return c.json({ success: true }, httpStatus.NO_CONTENT);
  }

  await deleteRefreshToken(tokenFromCookie);

  deleteCookie(c, config.jwt.refresh_token.cookie_name, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  return c.json({ success: true }, httpStatus.NO_CONTENT);
});

app.post("/auth/refresh", async (c) => {
  const refreshToken = getCookie(
    c,
    config.jwt.refresh_token.cookie_name
  );

  if (!refreshToken) c.json({ success: false }, httpStatus.UNAUTHORIZED);

  deleteCookie(c, config.jwt.refresh_token.cookie_name, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });

  const found = await checkRefreshToken(refreshToken as string);
  if (!found) {
    try {
      const payload = await verify(
        refreshToken as string,
        config.jwt.refresh_token.secret
      );
      await purgeRefreshTokens(payload.sub as string)
    } catch (error) {
      console.error(error);
    } finally {
      return c.json({ success: false }, httpStatus.FORBIDDEN)
    }
  }

  await deleteRefreshToken(refreshToken as string);

  try {
    const payload = await verify(
      refreshToken as string,
      config.jwt.refresh_token.secret,
    );

    if (payload.sub != found.userId) {
      return c.json({ success: false }, httpStatus.FORBIDDEN)
    }

    const [
      accessToken,
      newRefreshToken,
    ] = await Promise.all([
      createAccessToken(found.userId),
      createRefreshToken(found.userId),
    ]);

    await saveRefreshToken(newRefreshToken, found.userId);

    setCookie(
      c,
      config.jwt.refresh_token.cookie_name,
      newRefreshToken,
      {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    )

    return c.json({ success: true, accessToken });
  } catch (error) {
    console.error(error);
    return c.json({ success: true }, httpStatus.FORBIDDEN)
  }
});

const SendVerificationEmail = z.object({
  email: z.string().email(),
})

app.post("send-verification-email", validator("json", SendVerificationEmail), async (c) => {
  const data = c.req.valid("json");
  const user = await getUser(data.email);
  if (!user) return c.json({
    success: false,
    cause: "Email not found",
  }, httpStatus.UNAUTHORIZED);

  if (user.emailVerified) return c.json({
    success: false,
    cuase: "Email already verified",
  }, httpStatus.CONFLICT);

  const existing = await getExistingVerificationToken(user.id);

  if (existing) return c.json({
    success: false,
    cause: "Verification email already sent",
  }, httpStatus.BAD_REQUEST);

  const verification = await createEmailVerificationToken(user.id);
  sendVerifyEmail(user.email, verification.token);
  return c.json({ success: true });
})

app.post("verify-email/:token", async (c) => {
  const verificationToken = c.req.param("token");
  if (!verificationToken) {
    return c.json({ success: false }, httpStatus.NOT_FOUND);
  }

  const token = await getEmailVerificationToken(verificationToken);

  if (!token || token.expiresAt < new Date()) {
    return c.json({
      success: false,
      message: "Invalid or expired token"
    }, httpStatus.NOT_FOUND);
  }

  validateUserEmail(token.userId);
  purgeEmailVerificationTokens(token.userId);
  return c.json({ success: true });
});

const ForgotPasswordRequest = z.object({
  email: z.string().email(),
});

app.post("/forgot-password", validator("json", ForgotPasswordRequest), async (c) => {
  const data = c.req.valid("json");

  if (!data.email) return c.json({
    success: false,
    cause: "Email is required",
  }, httpStatus.BAD_REQUEST);

  const user = await getUser(data.email);

  if (!user || !user.emailVerified) return c.json({
    success: false,
    cause: "Email not validated",
  }, httpStatus.UNAUTHORIZED);

  const resetToken = await createResetToken(user.id);

  sendResetEmail(data.email, resetToken.token);

  return c.json({ success: true });
});

const PasswordResetRequest = z.object({
  password: z.string().min(8),
});

app.post("/reset-password/:token", validator("json", PasswordResetRequest), async (c) => {
  const data = c.req.valid("json");
  const token = c.req.param("password");

  if (!token) return c.json({ success: false }, httpStatus.NOT_FOUND);

  const resetToken = await getResetToken(token);

  if (!resetToken) return c.json({
    success: false,
    cause: "Invalid or expired token",
  }, httpStatus.NOT_FOUND);

  const hashedPassword = await argon.hash(data.password);
  await Promise.all([
    updateUserPassword(resetToken.userId, hashedPassword),
    purgeResetToken(resetToken.userId),
    purgeRefreshTokens(resetToken.userId),
  ]);

  return c.json({ success: true });
});

serve(app, (info) => {
  console.log(`listening on https://localhost:${info.port}`);
});
