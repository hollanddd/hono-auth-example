import { createRoute } from "@hono/zod-openapi";
import { SendVerificationEmailRequest } from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const sendVerificationEmail = createRoute({
  method: "post",
  path: "send-verification-email",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SendVerificationEmailRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Email verification email sent",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    400: {
      description: "Bad request",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict - Email already verified",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
  },
});
