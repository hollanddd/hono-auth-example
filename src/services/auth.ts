import db from "../config/prisma.js";
import { randomUUID } from "crypto";

export const checkUserEmail = async (email: string) => {
  const user = await db.user.findUnique({ where: { email } });
  return user ? true : false;
};

export const createEmailVerificationToken = (userId: string) =>
  db.emailVerificationToken.create({
    data: {
      expiresAt: new Date(Date.now() + 3600000),
      token: randomUUID(),
      userId,
    },
  });

export const createResetToken = (userId: string) =>
  db.resetToken.create({
    data: {
      expiresAt: new Date(Date.now() + 3600000),
      token: randomUUID(),
      userId,
    },
  });

export const getResetToken = (token: string) =>
  db.resetToken.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
  });

export const getEmailVerificationToken = (token: string) =>
  db.emailVerificationToken.findUnique({
    where: { token },
  });

export const purgeEmailVerificationTokens = (userId: string) =>
  db.emailVerificationToken.deleteMany({
    where: { userId },
  });

export const getExistingVerificationToken = (id: string) =>
  db.emailVerificationToken.findFirst({
    where: {
      user: { id },
      expiresAt: { gt: new Date() },
    },
  });

export const checkRefreshToken = (token: string) =>
  db.refreshToken.findUnique({
    where: { token },
  });

export const purgeRefreshTokens = (userId: string) =>
  db.refreshToken.deleteMany({
    where: { userId },
  });

export const deleteRefreshToken = (token: string) =>
  db.refreshToken.delete({
    where: { token },
  });

export const purgeResetToken = (userId: string) =>
  db.resetToken.deleteMany({
    where: { userId },
  });

export const saveRefreshToken = (token: string, userId: string) =>
  db.refreshToken.create({
    data: { token, userId },
  });
