import config from "../config/config.js";
import { sign } from "hono/jwt";

export const createAccessToken = (userId: number | string): Promise<string> =>
  sign(
    {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 20,
    },
    config.jwt.access_token.secret,
  );

export const createRefreshToken = (userId: number | string): Promise<string> =>
  sign(
    {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    },
    config.jwt.refresh_token.secret,
  );
