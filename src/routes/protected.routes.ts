import { createRoute } from "@hono/zod-openapi";

export const identity = createRoute({
  method: "get",
  path: "/protected/ident",
  request: {},
  responses: {
    200: {
      description: "Identity from JWT",
    },
  },
});
