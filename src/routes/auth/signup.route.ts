import { createRoute } from "@hono/zod-openapi";

import { SignUpRequest } from "../../schemas/auth.schemas.js";
import { ResponseSchema } from "../../schemas/response.schemas.js";

export const signup = createRoute({
  method: "post",
  path: "/auth/signup",
  request: {
    body: {
      content: {
        "application/json": {
          schema: SignUpRequest,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Successfully logged in",
      content: {
        "application/json": {
          schema: ResponseSchema,
        },
      },
    },
    409: {
      description: "Conflict - User already exists",
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
