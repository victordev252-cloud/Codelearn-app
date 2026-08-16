import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
};

function encryptionKey() {
  return crypto.createHash("sha256").update(ENV.cookieSecret || "mailforge-development-secret").digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

export function decryptSecret(value: string) {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const ciphertext = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

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
