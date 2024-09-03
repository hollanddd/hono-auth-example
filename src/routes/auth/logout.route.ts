import { createRoute } from "@hono/zod-openapi";

export const logout = createRoute({
  method: "post",
  path: "/auth/logout",
  responses: {
    204: {
      description: "Successfully logged out",
    },
  },
});
