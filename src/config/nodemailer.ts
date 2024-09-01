import nodemailer, { type Transporter } from "nodemailer";
import config from "./config.js";

let transporter: Transporter | null = null;

const createTestAccount = async () => {
  try {
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      }
    });
    console.log(account);
  } catch (error) {
    console.error(error);
  }
}

if (config.node_env == "dev") {
  void createTestAccount();
}

export default transporter;

