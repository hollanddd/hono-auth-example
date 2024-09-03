import { serve } from "@hono/node-server";
import { prometheus } from "@hono/prometheus";
import * as argon from "@node-rs/argon2";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { etag } from "hono/etag";
import { jwt, verify } from "hono/jwt";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { requestId } from "hono/request-id";
import { StatusCodes as httpStatus } from "http-status-codes";

import config from "./config/config.js";
import {
  signup,
  login,
  logout,
  tokenRefresh,
  sendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "./routes/auth/index.js";
import { sendResetEmail, sendVerifyEmail } from "./services/email.js";
import {
  createUser,
  getUser,
  updateUserPassword,
  validateUserEmail,
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
  saveRefreshToken,
} from "./services/auth.js";
import { createAccessToken, createRefreshToken } from "./services/token.js";

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { metrics } from "./routes/metrics.routes.js";
import { identity } from "./routes/protected.routes.js";

const { printMetrics, registerMetrics } = prometheus();

const app = new OpenAPIHono();
app.use(etag(), logger(), prettyJSON());
app.use("*", requestId());
app.use("/protected/*", jwt({ secret: config.jwt.access_token.secret }));
app.use("*", registerMetrics);
app.openapi(metrics, printMetrics);
app.openapi(identity, (c) => {
  const payload = c.get("jwtPayload");
  return c.json(payload);
});

app.openapi(signup, async (c) => {
  const data = c.req.valid("json");
  const exists = await checkUserEmail(data.email);
  if (exists) return c.json({ success: false }, httpStatus.CONFLICT);

  try {
    const hashedPassword = await argon.hash(data.password);
    const user = await createUser(data.username, data.email, hashedPassword);
    const verification = await createEmailVerificationToken(user.id);
    sendVerifyEmail(user.email, verification.token);
    return c.json({ success: true }, httpStatus.CREATED);
  } catch (error) {
    console.error(error);
    return c.json(
      { success: false, cause: error },
      httpStatus.INTERNAL_SERVER_ERROR,
    );
  }
});

app.openapi(login, async (c) => {
  const data = c.req.valid("json");
  const user = await getUser(data.email);
  if (!user) return c.json(httpStatus.FORBIDDEN);
  if (!user.emailVerified)
    return c.json(
      {
        success: false,
        cause: "You must verify your email address before you can log in.",
      },
      httpStatus.FORBIDDEN,
    );

  try {
    if (await argon.verify(user.password, data.password)) {
      const tokenFromCookie = getCookie(
        c,
        config.jwt.refresh_token.cookie_name,
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

      const [accessToken, refreshToken] = await Promise.all([
        createAccessToken(user.id),
        createRefreshToken(user.id),
      ]);

      await saveRefreshToken(refreshToken, user.id);

      setCookie(c, config.jwt.refresh_token.cookie_name, refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: true,
        maxAge: 24 * 3600,
      });

      return c.json({ success: true, accessToken });
    } else {
      return c.json({ success: false }, httpStatus.UNAUTHORIZED);
    }
  } catch (error) {
    console.error(error);
    return c.json({ success: false }, httpStatus.INTERNAL_SERVER_ERROR);
  }
});

app.openapi(logout, async (c) => {
  const tokenFromCookie = getCookie(c, config.jwt.refresh_token.cookie_name);

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

app.openapi(tokenRefresh, async (c) => {
  const refreshToken = getCookie(c, config.jwt.refresh_token.cookie_name);

  if (!refreshToken) {
    return c.json({ success: false }, httpStatus.UNAUTHORIZED);
  }

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
        config.jwt.refresh_token.secret,
      );
      await purgeRefreshTokens(payload.sub as string);
    } catch (error) {
      console.error(error);
    } finally {
      return c.json({ success: false }, httpStatus.FORBIDDEN);
    }
  }

  await deleteRefreshToken(refreshToken as string);

  try {
    const payload = await verify(
      refreshToken as string,
      config.jwt.refresh_token.secret,
    );

    if (payload.sub != found.userId) {
      return c.json({ success: false }, httpStatus.FORBIDDEN);
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      createAccessToken(found.userId),
      createRefreshToken(found.userId),
    ]);

    await saveRefreshToken(newRefreshToken, found.userId);

    setCookie(c, config.jwt.refresh_token.cookie_name, newRefreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return c.json({ success: true, accessToken });
  } catch (error) {
    console.error(error);
    return c.json({ success: true }, httpStatus.FORBIDDEN);
  }
});

app.openapi(sendVerificationEmail, async (c) => {
  const data = c.req.valid("json");
  const user = await getUser(data.email);
  if (!user)
    return c.json(
      {
        success: false,
        cause: "Email not found",
      },
      httpStatus.UNAUTHORIZED,
    );

  if (user.emailVerified)
    return c.json(
      {
        success: false,
        cuase: "Email already verified",
      },
      httpStatus.CONFLICT,
    );

  const existing = await getExistingVerificationToken(user.id);

  if (existing)
    return c.json(
      {
        success: false,
        cause: "Verification email already sent",
      },
      httpStatus.BAD_REQUEST,
    );

  const verification = await createEmailVerificationToken(user.id);
  sendVerifyEmail(user.email, verification.token);
  return c.json({ success: true });
});

app.openapi(verifyEmail, async (c) => {
  const { token } = c.req.valid("param");
  if (!token) {
    return c.json({ success: false }, httpStatus.NOT_FOUND);
  }

  const existing = await getEmailVerificationToken(token);

  if (!existing || existing.expiresAt < new Date()) {
    return c.json(
      {
        success: false,
        message: "Invalid or expired token",
      },
      httpStatus.NOT_FOUND,
    );
  }

  validateUserEmail(existing.userId);
  purgeEmailVerificationTokens(existing.userId);
  return c.json({ success: true });
});

app.openapi(forgotPassword, async (c) => {
  const data = c.req.valid("json");

  if (!data.email) {
    return c.json(
      {
        success: false,
        cause: "Email is required",
      },
      httpStatus.BAD_REQUEST,
    );
  }

  const user = await getUser(data.email);

  if (!user || !user.emailVerified) {
    return c.json(
      {
        success: false,
        cause: "Email not validated",
      },
      httpStatus.UNAUTHORIZED,
    );
  }

  const resetToken = await createResetToken(user.id);

  sendResetEmail(data.email, resetToken.token);

  return c.json({ success: true });
});

app.openapi(resetPassword, async (c) => {
  const data = c.req.valid("json");
  const { token } = c.req.valid("param");

  if (!token) {
    return c.json({ success: false }, httpStatus.NOT_FOUND);
  }

  const resetToken = await getResetToken(token);

  if (!resetToken)
    return c.json(
      {
        success: false,
        cause: "Invalid or expired token",
      },
      httpStatus.NOT_FOUND,
    );

  const hashedPassword = await argon.hash(data.password);
  await Promise.all([
    updateUserPassword(resetToken.userId, hashedPassword),
    purgeResetToken(resetToken.userId),
    purgeRefreshTokens(resetToken.userId),
  ]);

  return c.json({ success: true });
});

app.get("/ui", swaggerUI({ url: "docs" }));

app.doc("docs", {
  openapi: "3.1.0",
  info: {
    version: "0.0.1",
    title: "Auth API",
  },
});

serve(app, (info) => {
  console.log(`listening on https://localhost:${info.port}`);
});
