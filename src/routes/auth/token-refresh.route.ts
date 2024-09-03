import { createRoute } from "@hono/zod-openapi";
import { TokenResponseSchema } from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const tokenRefresh = createRoute({
  method: "post",
  path: "/auth/refresh",
  responses: {
    200: {
      description: "Token refreshed",
      content: {
        "application/json": {
          schema: TokenResponseSchema,
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
    403: {
      description: "Forbidden",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
  },
});
