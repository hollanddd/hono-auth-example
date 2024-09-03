import { z } from "@hono/zod-openapi";

export const ForgotPasswordRequest = z.object({
  email: z.string().email().openapi({
    example: "mail@test.com",
  }),
});

export const LoginRequest = z.object({
  email: z.string().email().openapi({
    description: "User email",
    example: "example@email.com",
  }),
  password: z.string().min(8).openapi({
    description: "User password",
  }),
});

export const TokenPathParam = z.object({
  token: z
    .string()
    .min(3)
    .openapi({
      param: {
        name: "token",
        in: "path",
      },
    }),
});

export const TokenResponseSchema = z.object({
  success: z.boolean().openapi({
    example: true,
  }),
  accessToken: z.string().openapi({
    description: "JWT access token",
  }),
});

export const PasswordResetRequest = z.object({
  password: z.string().min(8).openapi({
    description: "The new password",
  }),
});

export const SendVerificationEmailRequest = z.object({
  email: z.string().email().openapi({
    example: "example@email.com",
  }),
});

export const SignUpRequest = z
  .object({
    username: z.string().openapi({
      description: "User name",
    }),
    email: z.string().email().openapi({
      description: "User email - used to login",
      example: "example@email.com",
    }),
    password: z.string().min(8).openapi({
      description: "User password",
    }),
    confirmPassword: z.string().min(8).openapi({
      description: "Password confirmation - must match password",
    }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password != confirmPassword)
      ctx.addIssue({
        code: "custom",
        message: "The password did not match",
        path: ["confirmPassword"],
      });
  });
