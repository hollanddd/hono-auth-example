const config = {
  node_env: process.env.NODE_ENV ?? "dev",
  jwt: {
    access_token: {
      secret: "changeme",
    },
    refresh_token: {
      cookie_name: "refresh_token",
      secret: "changeme",
    },
  },
  server: {
    url: process.env.SERVER_URL ?? `http://localhost`,
  },
} as const;

export default config;
