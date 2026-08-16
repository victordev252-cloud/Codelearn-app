# MailForge Flask for Pydroid3

This folder is a self-contained Python Flask version of MailForge designed to run in Pydroid3. It uses SQLite, so it does not require MySQL, Node.js, pnpm, or React.

## Pydroid3 setup

Open Pydroid3, install the Flask package from the Pip screen, or open the Pydroid3 terminal and run:

```bash
cd /storage/emulated/0/Download/Codelearn-app/pydroid_mailforge
pip install -r requirements.txt
python app.py
```

If the project is stored in Pydroid3's private folder, use its actual path instead. After the server starts, open Chrome and visit:

```text
http://127.0.0.1:5000
```

The first-run login is `admin@example.com` with password `ChangeMe123!`. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `SECRET_KEY` before production. The database file `mailforge.db` is created automatically in this folder.

## Email setup

Log in and open **Settings**. For Gmail, enable two-step verification and create a Gmail App Password. Then enter:

```text
SMTP host: smtp.gmail.com
SMTP port: 587
SMTP username: your Gmail address
SMTP password: your App Password
From email: the same verified Gmail address
```

The same form supports Outlook, SendGrid, Amazon SES, Mailgun, and custom SMTP providers. Use **Send test** before sending a campaign. Never share the SMTP password or upload `mailforge.db` to a public repository.

## Campaign workflow

Add consented contacts from **Subscribers**, create a draft under **Compose email**, and include `{{unsubscribe_url}}` in marketing HTML. The send action skips unsubscribed contacts, sends through SMTP, records each recipient result in **Email history**, and marks the campaign status.

For a local Android-only test, this app is ready without a database service. For public production hosting, use a managed server and a proper secret manager rather than exposing a Pydroid3 process to the internet.
