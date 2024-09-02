import config from "../config/config.js";
import transport from "../config/nodemailer.js";

export const sendVerifyEmail = (email: string, token: string) => {
  const link = `${config.server.url}/verify-email/${token}`;
  const options = {
    from: "some-user",
    to: email,
    subject: "Email verification",
    html: `Click <a href="${link}">${link}</a> to verify your email`,
  };
  transport?.sendMail(options, (error: Error | null, info: any) => {
    error ? console.error(error) : console.log(info.response);
  });
};

export const sendResetEmail = (email: string, token: string) => {
  const link = `${config.server.url}/reset-password/${token}`;
  const options = {
    from: "some-user",
    to: email,
    subject: "Password reset",
    html: `Click <a href="${link}">${link}</a> to reset your password`,
  };
  transport?.sendMail(options, (error: Error | null, info: any) => {
    error ? console.error(error) : console.log(info.response);
  });
};
