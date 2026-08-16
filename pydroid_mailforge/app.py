import os
import re
import secrets
import smtplib
import sqlite3
from datetime import datetime
from functools import wraps
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, flash, g, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "mailforge.db")
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "change-this-development-secret")
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    connection = g.pop("db", None)
    if connection is not None:
        connection.close()


def init_db():
    connection = sqlite3.connect(DB_PATH)
    connection.executescript("""
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, group_name TEXT NOT NULL DEFAULT 'Newsletter', status TEXT NOT NULL DEFAULT 'active', unsubscribe_token TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL, last_email TEXT);
    CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, sent_at TEXT);
    CREATE TABLE IF NOT EXISTS email_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER, recipient TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS smtp_settings (id INTEGER PRIMARY KEY CHECK(id=1), host TEXT NOT NULL, port INTEGER NOT NULL, username TEXT NOT NULL, password TEXT NOT NULL, from_email TEXT NOT NULL, from_name TEXT NOT NULL);
    """)
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")
    existing = connection.execute("SELECT id FROM admins LIMIT 1").fetchone()
    if not existing:
        connection.execute("INSERT INTO admins(email,password_hash,created_at) VALUES(?,?,?)", (admin_email, generate_password_hash(admin_password), datetime.utcnow().isoformat()))
    connection.commit()
    connection.close()


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_id"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)
    return wrapped


def csrf_ok():
    return secrets.compare_digest(request.form.get("csrf", ""), session.get("csrf", ""))


def valid_email(value):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value or ""))


def smtp_config():
    row = db().execute("SELECT * FROM smtp_settings WHERE id=1").fetchone()
    if row:
        return dict(row)
    return {"host": os.getenv("SMTP_HOST", ""), "port": int(os.getenv("SMTP_PORT", "587")), "username": os.getenv("SMTP_USERNAME", ""), "password": os.getenv("SMTP_PASSWORD", ""), "from_email": os.getenv("SMTP_FROM", ""), "from_name": os.getenv("SMTP_FROM_NAME", "MailForge")}


def send_message(recipient, subject, html):
    settings = smtp_config()
    required = [settings["host"], settings["username"], settings["password"], settings["from_email"]]
    if not all(required):
        raise RuntimeError("SMTP settings are incomplete. Open Settings and save your email connection first.")
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f'{settings["from_name"]} <{settings["from_email"]}>'
    message["To"] = recipient
    message["List-Unsubscribe"] = f'<{request.host_url.rstrip("/")}/unsubscribe/>'
    message.attach(MIMEText(html, "html", "utf-8"))
    secure = int(settings["port"]) == 465
    server = smtplib.SMTP_SSL(settings["host"], int(settings["port"])) if secure else smtplib.SMTP(settings["host"], int(settings["port"]))
    try:
        if not secure:
            server.starttls()
        server.login(settings["username"], settings["password"])
        server.sendmail(settings["from_email"], [recipient], message.as_string())
    finally:
        server.quit()


@app.context_processor
def inject_globals():
    return {"csrf": session.get("csrf", ""), "year": datetime.utcnow().year}


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if not csrf_ok():
            flash("Security token expired. Try again.", "error")
        else:
            admin = db().execute("SELECT * FROM admins WHERE email=?", (request.form.get("email", "").strip().lower(),)).fetchone()
            if admin and check_password_hash(admin["password_hash"], request.form.get("password", "")):
                session.clear(); session["admin_id"] = admin["id"]; session["admin_email"] = admin["email"]; session["csrf"] = secrets.token_urlsafe(24)
                return redirect(url_for("dashboard"))
            flash("Email or password is incorrect.", "error")
    session.setdefault("csrf", secrets.token_urlsafe(24))
    return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/")
@login_required
def dashboard():
    stats = {
        "total": db().execute("SELECT COUNT(*) FROM subscribers").fetchone()[0],
        "active": db().execute("SELECT COUNT(*) FROM subscribers WHERE status='active'").fetchone()[0],
        "unsubscribed": db().execute("SELECT COUNT(*) FROM subscribers WHERE status='unsubscribed'").fetchone()[0],
        "sent": db().execute("SELECT COUNT(*) FROM email_logs WHERE status='sent'").fetchone()[0],
        "campaigns": db().execute("SELECT COUNT(*) FROM campaigns").fetchone()[0],
    }
    campaigns = db().execute("SELECT * FROM campaigns ORDER BY id DESC LIMIT 5").fetchall()
    return render_template("dashboard.html", stats=stats, campaigns=campaigns)


@app.route("/subscribers", methods=["GET", "POST"])
@login_required
def subscribers():
    if request.method == "POST":
        if not csrf_ok(): flash("Security token expired.", "error")
        else:
            name, email, group_name = request.form.get("name", "").strip(), request.form.get("email", "").strip().lower(), request.form.get("group_name", "Newsletter").strip()
            if not name or not valid_email(email): flash("Enter a valid name and email.", "error")
            else:
                try:
                    db().execute("INSERT INTO subscribers(name,email,group_name,unsubscribe_token,created_at) VALUES(?,?,?,?,?)", (name, email, group_name or "Newsletter", secrets.token_urlsafe(32), datetime.utcnow().isoformat()))
                    db().commit(); flash("Subscriber added.", "success")
                except sqlite3.IntegrityError: flash("That email already exists.", "error")
    query = request.args.get("q", "").strip()
    rows = db().execute("SELECT * FROM subscribers WHERE name LIKE ? OR email LIKE ? ORDER BY id DESC", (f"%{query}%", f"%{query}%")).fetchall()
    return render_template("subscribers.html", subscribers=rows, query=query)


@app.post("/subscribers/<int:subscriber_id>/toggle")
@login_required
def toggle_subscriber(subscriber_id):
    if not csrf_ok(): flash("Security token expired.", "error")
    else:
        db().execute("UPDATE subscribers SET status=CASE WHEN status='active' THEN 'unsubscribed' ELSE 'active' END WHERE id=?", (subscriber_id,)); db().commit()
    return redirect(url_for("subscribers"))


@app.route("/campaigns")
@login_required
def campaigns():
    return render_template("campaigns.html", campaigns=db().execute("SELECT * FROM campaigns ORDER BY id DESC").fetchall())


@app.route("/campaign/new", methods=["GET", "POST"])
@login_required
def campaign_new():
    default_html = '<div style="max-width:640px;margin:auto;padding:40px;font-family:Arial;color:#172033"><h1>Your message starts here.</h1><p>Write a useful update for your audience.</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p></div>'
    if request.method == "POST":
        if not csrf_ok(): flash("Security token expired.", "error")
        else:
            name, subject, html = request.form.get("name", "").strip(), request.form.get("subject", "").strip(), request.form.get("html", "")
            if not name or not subject or not html: flash("Name, subject and HTML are required.", "error")
            else:
                db().execute("INSERT INTO campaigns(name,subject,html,status,created_at) VALUES(?,?,?,?,?)", (name, subject, html, "draft", datetime.utcnow().isoformat())); db().commit(); flash("Campaign saved as draft.", "success"); return redirect(url_for("campaigns"))
    return render_template("campaign_editor.html", campaign=None, default_html=default_html)


@app.post("/campaign/<int:campaign_id>/send")
@login_required
def campaign_send(campaign_id):
    if not csrf_ok(): flash("Security token expired.", "error"); return redirect(url_for("campaigns"))
    campaign = db().execute("SELECT * FROM campaigns WHERE id=?", (campaign_id,)).fetchone()
    audience = db().execute("SELECT * FROM subscribers WHERE status='active'").fetchall()
    if not campaign or not audience: flash("Campaign or active audience is missing.", "error"); return redirect(url_for("campaigns"))
    sent = failed = 0
    for subscriber in audience:
        html = campaign["html"].replace("{{unsubscribe_url}}", f'{request.host_url.rstrip("/")}/unsubscribe/{subscriber["unsubscribe_token"]}')
        try:
            send_message(subscriber["email"], campaign["subject"], html)
            db().execute("INSERT INTO email_logs(campaign_id,recipient,status,created_at) VALUES(?,?,?,?,?)", (campaign_id, subscriber["email"], "sent", datetime.utcnow().isoformat())); sent += 1
        except Exception as error:
            db().execute("INSERT INTO email_logs(campaign_id,recipient,status,error,created_at) VALUES(?,?,?,?,?)", (campaign_id, subscriber["email"], "failed", str(error)[:500], datetime.utcnow().isoformat())); failed += 1
    db().execute("UPDATE campaigns SET status=?,sent_at=? WHERE id=?", ("sent" if sent else "failed", datetime.utcnow().isoformat(), campaign_id)); db().commit()
    flash(f"Campaign finished: {sent} sent, {failed} failed.", "success" if sent else "error")
    return redirect(url_for("campaigns"))


@app.route("/history")
@login_required
def history():
    logs = db().execute("SELECT email_logs.*, campaigns.name AS campaign_name FROM email_logs LEFT JOIN campaigns ON campaigns.id=email_logs.campaign_id ORDER BY email_logs.id DESC LIMIT 300").fetchall()
    return render_template("history.html", logs=logs)


@app.route("/settings", methods=["GET", "POST"])
@login_required
def settings():
    current = smtp_config()
    if request.method == "POST":
        if not csrf_ok(): flash("Security token expired.", "error")
        else:
            values = (request.form.get("host", "").strip(), int(request.form.get("port", "587")), request.form.get("username", "").strip(), request.form.get("password", ""), request.form.get("from_email", "").strip(), request.form.get("from_name", "MailForge").strip())
            db().execute("INSERT INTO smtp_settings(id,host,port,username,password,from_email,from_name) VALUES(1,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET host=excluded.host,port=excluded.port,username=excluded.username,password=excluded.password,from_email=excluded.from_email,from_name=excluded.from_name", values); db().commit(); flash("SMTP settings saved.", "success"); current = smtp_config()
    return render_template("settings.html", settings=current)


@app.post("/settings/test")
@login_required
def settings_test():
    if not csrf_ok(): flash("Security token expired.", "error")
    else:
        recipient = request.form.get("test_email", "").strip()
        if not valid_email(recipient): flash("Enter a valid test email.", "error")
        else:
            try: send_message(recipient, "MailForge test email", "<h1>SMTP works.</h1><p>Your MailForge email connection is ready.</p>"); flash("Test email sent successfully.", "success")
            except Exception as error: flash(str(error), "error")
    return redirect(url_for("settings"))


@app.route("/unsubscribe/<token>")
def unsubscribe(token):
    row = db().execute("SELECT id FROM subscribers WHERE unsubscribe_token=?", (token,)).fetchone()
    if row:
        db().execute("UPDATE subscribers SET status='unsubscribed' WHERE id=?", (row["id"],)); db().commit(); return render_template("unsubscribe.html", success=True)
    return render_template("unsubscribe.html", success=False), 404


@app.route("/init")
def initialize():
    init_db(); return "Database initialized. Go to /login"


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
