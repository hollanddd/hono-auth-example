import { createRoute } from "@hono/zod-openapi";
import {
  LoginRequest,
  TokenResponseSchema,
} from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const login = createRoute({
  method: "post",
  path: "/auth/login",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginRequest,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Successfully logged in",
      content: {
        "application/json": {
          schema: TokenResponseSchema,
        },
      },
    },
    401: {
      description: "Unauthorized - invalid password",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    403: {
      description: "Forbidden - email not verified",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    501: {
      description: "Internal server error",
    },
  },
});
