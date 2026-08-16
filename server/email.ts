import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
};

function transporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? config.port === 465,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function verifySmtp(config: SmtpConfig) {
  await transporter(config).verify();
  return { verified: true as const };
}

export async function sendHtmlEmail(input: {
  smtp: SmtpConfig;
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const info = await transporter(input.smtp).sendMail({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
    headers: { "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  return { messageId: info.messageId, accepted: info.accepted.length, rejected: info.rejected.length };
}
