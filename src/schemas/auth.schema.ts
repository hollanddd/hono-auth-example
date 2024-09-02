import { z } from "zod";

export const ForgotPasswordRequest = z.object({
  email: z.string().email(),
});

export const LoginRequest = z.object({
  email: z.string(),
  password: z.string(),
});

export const PasswordResetRequest = z.object({
  password: z.string().min(8),
});

export const SendVerificationEmailRequest = z.object({
  email: z.string().email(),
});

export const SignUpRequest = z
  .object({
    username: z.string(),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password != confirmPassword)
      ctx.addIssue({
        code: "custom",
        message: "The password did not match",
        path: ["confirmPassword"],
      });
  });
