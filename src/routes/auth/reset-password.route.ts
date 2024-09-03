import { createRoute } from "@hono/zod-openapi";
import {
  PasswordResetRequest,
  TokenPathParam,
} from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const resetPassword = createRoute({
  method: "post",
  path: "/reset-password/{token}",
  request: {
    params: TokenPathParam,
    body: {
      content: {
        "application/json": {
          schema: PasswordResetRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password reset",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    404: {
      description: "Not found",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
  },
});
