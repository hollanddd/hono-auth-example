import db from "../config/prisma.js";

export const createUser = (
  username: string,
  email: string,
  hashedPassword: string,
) =>
  db.user.create({
    data: {
      name: username,
      email: email,
      password: hashedPassword,
    },
  });

export const getUser = (email: string) =>
  db.user.findUnique({ where: { email } });

export const validateUserEmail = (id: string) =>
  db.user.update({
    where: { id },
    data: { emailVerified: new Date() },
  });

export const updateUserPassword = (id: string, password: string) =>
  db.user.update({
    where: { id },
    data: { password },
  });
