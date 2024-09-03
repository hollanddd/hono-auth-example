import { createRoute } from "@hono/zod-openapi";
import { ForgotPasswordRequest } from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const forgotPassword = createRoute({
  method: "post",
  path: "/forgot-password",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ForgotPasswordRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Reset user password",
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
  },
});
