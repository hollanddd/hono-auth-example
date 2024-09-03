import { createRoute } from "@hono/zod-openapi";

export const metrics = createRoute({
  method: "get",
  path: "/metrics",
  request: {},
  responses: {
    200: {
      description: "Application metrics",
    },
  },
});
