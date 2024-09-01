import client from "../config/prisma.js";

export const createUser = (
  username: string,
  email: string,
  hashedPassword: string,
) => client.user.create({
  data: {
    name: username,
    email: email,
    password: hashedPassword,
  },
});

export const getUser = (
  email: string,
) => client.user.findUnique({ where: { email } });

export const validateUserEmail = (
  id: string,
) => client.user.update({
  where: { id },
  data: { emailVerified: new Date() },
});

export const updateUserPassword = (
  id: string,
  password: string
) => client.user.update({
  where: { id },
  data: { password },
});
