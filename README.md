# MailForge

MailForge is a responsive email studio for creating, previewing, managing, and sending HTML campaigns. The workspace includes a dashboard, campaign composer, subscriber list, delivery history, analytics, SMTP settings, and responsible-sending safeguards such as suppression of unsubscribed contacts and unsubscribe-link support.

## Features

The application provides an Overview dashboard with delivery volume, audience health, open-rate metrics, and recent campaigns. The Compose workspace supports subject lines, recipient groups, raw HTML editing, live preview, draft state, and send actions. Subscribers can be searched, added, imported through the UI affordance, grouped, and toggled between active and unsubscribed status. Campaigns, delivery history, and analytics have dedicated responsive views.

The server includes protected SMTP procedures for connection verification and test delivery. SMTP credentials are accepted only on the server, are not written to logs, and are never returned to the browser. Configure a real delivery provider before using production sends.

## Development

```bash
pnpm install
pnpm dev
```

Validation commands:

```bash
pnpm check
pnpm test
pnpm build
```

## SMTP configuration

Create a local `.env` file from the values below and replace the placeholders with credentials from your SMTP provider. Do not commit `.env` or real credentials.

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=sender@example.com
SMTP_PASSWORD=use-an-app-password-or-provider-secret
SMTP_FROM=sender@example.com
```

Port `587` normally uses STARTTLS, while port `465` uses implicit TLS. Gmail, Outlook, Amazon SES, Mailgun, SendGrid, and custom SMTP servers can be used when their provider credentials and sender verification requirements are satisfied.

The protected server procedures are available as `email.verify` and `email.sendTest` through the application router. A production deployment should persist campaigns and subscriber records in the project database, configure a background delivery queue for large sends, and keep provider rate limits in the sending service.

## Responsible sending

MailForge is intended for permission-based communication. Only send to contacts who have consented, suppress unsubscribed recipients, keep the sender identity clear, and include a working unsubscribe path for marketing messages. The interface deliberately does not implement spam bypasses, stealth delivery, or anonymous bulk mailing.

## Project structure

The main workspace UI is in `client/src/pages/Home.tsx`, global styling is in `client/src/index.css`, SMTP delivery is in `server/email.ts`, and the protected procedures are in `server/routers.ts`. The existing application authentication and server infrastructure remain available for production integration.
