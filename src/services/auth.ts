import client from "../config/prisma.js";
import { randomUUID } from "crypto";

export const checkUserEmail = async (email: string) => {
  const user = await client.user.findUnique({ where: { email } });
  return user ? true : false;
}

export const createEmailVerificationToken = (
  userId: string,
) => client.emailVerificationToken.create({
  data: {
    expiresAt: new Date(Date.now() + 3600000),
    token: randomUUID(),
    userId,
  },
});

export const createResetToken = (
  userId: string
) => client.resetToken.create({
  data: {
    expiresAt: new Date(Date.now() + 3600000),
    token: randomUUID(),
    userId,
  },
});

export const getResetToken = (
  token: string
) => client.resetToken.findFirst({
  where: {
    token,
    expiresAt: { gt: new Date() },
  }
});

export const getEmailVerificationToken = (
  token: string,
) => client.emailVerificationToken.findUnique({
  where: { token },
});

export const purgeEmailVerificationTokens = (
  userId: string,
) => client.emailVerificationToken.deleteMany({
  where: { userId },
});

export const getExistingVerificationToken = (
  id: string,
) => client.emailVerificationToken.findFirst({
  where: {
    user: { id },
    expiresAt: { gt: new Date() },
  },
})

export const checkRefreshToken = (
  token: string,
) => client.refreshToken.findUnique({
  where: { token },
});

export const purgeRefreshTokens = (
  userId: string,
) => client.refreshToken.deleteMany({
  where: { userId },
});

export const deleteRefreshToken = (
  token: string,
) => client.refreshToken.delete({
  where: { token },
});

export const purgeResetToken = (
  userId: string,
) => client.resetToken.deleteMany({
  where: { userId },
});

export const saveRefreshToken = (
  token: string,
  userId: string,
) => client.refreshToken.create({
  data: { token, userId },
});
