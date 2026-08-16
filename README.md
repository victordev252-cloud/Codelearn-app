# MailForge

MailForge is a full-stack HTML email management system. It provides a responsive private workspace for creating campaigns, managing consented subscribers, configuring SMTP delivery, sending test and production emails, reviewing delivery history, and monitoring campaign performance.

## What is implemented

The dashboard includes Overview, Compose Email, Campaigns, Subscribers, Email History, Analytics, and Settings views. The Compose workspace supports campaign metadata, recipient groups, raw HTML editing, preview, unsubscribe-token placeholders, and send actions. Subscriber records are persisted with status, group, consent timestamp, and a cryptographically random unsubscribe token. Unsubscribed records are suppressed from campaign sends.

The server provides protected procedures for listing and creating subscribers, toggling suppression status, saving and listing campaigns, reading delivery logs, verifying SMTP credentials, saving encrypted SMTP settings, sending test messages, and sending campaigns sequentially through the configured SMTP provider. Campaign sending records success or failure per recipient. The direct `/unsubscribe/:token` endpoint updates suppression status and returns a confirmation page.

SMTP passwords are encrypted with AES-256-GCM before persistence. The encryption key is derived from `JWT_SECRET`; use a long, stable secret in production and rotate credentials deliberately. Credentials are never returned by the settings query and are not included in delivery logs.

## Development

```bash
pnpm install
cp .env.example .env
pnpm db:push
pnpm dev
```

Validation commands:

```bash
pnpm check
pnpm test
pnpm build
```

## Required environment variables

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-secret
DATABASE_URL=mysql://user:password@localhost:3306/mailforge
```

For a server-level SMTP fallback, configure the following values. Workspace-level SMTP settings can also be saved through the protected settings procedure and will take precedence.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=sender@example.com
SMTP_PASSWORD=use-an-app-password-or-provider-secret
SMTP_FROM=sender@example.com
```

Port `587` normally uses STARTTLS and port `465` uses implicit TLS. Gmail, Outlook, Amazon SES, Mailgun, SendGrid, and custom SMTP servers are supported when the provider permits authenticated SMTP and the sender identity has been verified.

## Database migration

The new MailForge tables are included in `drizzle/0002_magenta_avengers.sql`. Run `pnpm db:push` with a valid `DATABASE_URL` to generate and apply the latest migration. The schema includes `subscribers`, `campaigns`, `email_logs`, and `smtp_settings` in addition to the existing application tables.

## Responsible sending

MailForge is designed for permission-based communication. Only send to contacts who have consented, suppress unsubscribed recipients, keep sender identity clear, include an unsubscribe link in marketing HTML, respect provider rate limits, and review bounces and failures. The application intentionally does not implement spam bypasses, stealth sending, anonymous bulk mail, or provider-limit evasion.

## Project structure

The main workspace UI is in `client/src/pages/Home.tsx`, styling is in `client/src/index.css`, the database schema is in `drizzle/schema.ts`, persistence helpers are in `server/db.ts`, SMTP encryption and delivery are in `server/email.ts`, API procedures are in `server/routers.ts`, and the public unsubscribe handler is in `server/_core/index.ts`.
