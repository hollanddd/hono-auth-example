import { z } from "@hono/zod-openapi";

export const ResponseSchema = z.object({
  success: z.boolean().default(true).openapi({
    example: true,
  }),
  message: z.string().optional().openapi({
    example: "Something happened",
  }),
  cause: z.string().optional().openapi({
    example: "Something failed",
  }),
});
