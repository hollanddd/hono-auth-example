import { createRoute } from "@hono/zod-openapi";
import { TokenPathParam } from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const verifyEmail = createRoute({
  method: "post",
  path: "/verify-email/{token}",
  request: {
    params: TokenPathParam,
  },
  responses: {
    200: {
      description: "Email verified",
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
