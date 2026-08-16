import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { campaigns, certificates, emailLogs, InsertUser, lessonProgress, projectSubmissions, smtpSettings, subscribers, users } from "../drizzle/schema";
import crypto from "node:crypto";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getProgress(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)).orderBy(desc(lessonProgress.updatedAt));
}

export async function saveLessonProgress(userId: number, lessonId: string, completed: boolean, quizScore = 0) {
  const db = await getDb(); if (!db) return { localOnly: true };
  const existing = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId))).limit(1);
  const values = { userId, lessonId, completed, quizScore, completedAt: completed ? new Date() : null };
  if (existing[0]) await db.update(lessonProgress).set(values).where(eq(lessonProgress.id, existing[0].id));
  else await db.insert(lessonProgress).values(values);
  return { saved: true };
}

export async function saveProjectSubmission(userId: number, projectId: string, status: "not_started" | "in_progress" | "submitted" | "reviewed", notes?: string) {
  const db = await getDb(); if (!db) return { localOnly: true };
  const existing = await db.select().from(projectSubmissions).where(and(eq(projectSubmissions.userId, userId), eq(projectSubmissions.projectId, projectId))).limit(1);
  const values = { userId, projectId, status, notes: notes ?? null, submittedAt: status === "submitted" ? new Date() : null };
  if (existing[0]) await db.update(projectSubmissions).set(values).where(eq(projectSubmissions.id, existing[0].id));
  else await db.insert(projectSubmissions).values(values);
  return { saved: true };
}

export async function getProjectSubmissions(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(projectSubmissions).where(eq(projectSubmissions.userId, userId)).orderBy(desc(projectSubmissions.updatedAt));
}

export async function getCertificate(userId: number, trackId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(certificates).where(and(eq(certificates.userId, userId), eq(certificates.trackId, trackId))).limit(1);
  return result[0];
}

export async function listSubscribers(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(subscribers).where(eq(subscribers.ownerId, ownerId)).orderBy(desc(subscribers.createdAt));
}

export async function addSubscriber(ownerId: number, input: { name: string; email: string; group?: string }) {
  const db = await getDb(); if (!db) return { localOnly: true, unsubscribeToken: crypto.randomUUID() };
  const email = input.email.trim().toLowerCase();
  const existing = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  if (existing[0]) throw new Error("A subscriber with this email already exists.");
  const unsubscribeToken = crypto.randomBytes(32).toString("hex");
  await db.insert(subscribers).values({ ownerId, name: input.name.trim(), email, group: input.group ?? "Newsletter", unsubscribeToken });
  return { created: true as const, unsubscribeToken };
}

export async function toggleSubscriber(ownerId: number, id: number) {
  const db = await getDb(); if (!db) return { localOnly: true };
  const existing = await db.select().from(subscribers).where(and(eq(subscribers.id, id), eq(subscribers.ownerId, ownerId))).limit(1);
  if (!existing[0]) throw new Error("Subscriber not found.");
  const status = existing[0].status === "active" ? "unsubscribed" : "active";
  await db.update(subscribers).set({ status }).where(and(eq(subscribers.id, id), eq(subscribers.ownerId, ownerId)));
  return { status };
}

export async function unsubscribeByToken(token: string) {
  const db = await getDb(); if (!db) return false;
  const existing = await db.select().from(subscribers).where(eq(subscribers.unsubscribeToken, token)).limit(1);
  if (!existing[0]) return false;
  await db.update(subscribers).set({ status: "unsubscribed" }).where(eq(subscribers.id, existing[0].id));
  return true;
}

export async function listCampaigns(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(campaigns).where(eq(campaigns.ownerId, ownerId)).orderBy(desc(campaigns.updatedAt));
}

export async function saveCampaign(ownerId: number, input: { id?: number; name: string; subject: string; html: string; status?: "draft" | "scheduled" }) {
  const db = await getDb(); if (!db) return { localOnly: true };
  const values = { ownerId, name: input.name.trim(), subject: input.subject.trim(), html: input.html, status: input.status ?? "draft" as const };
  if (input.id) {
    await db.update(campaigns).set(values).where(and(eq(campaigns.id, input.id), eq(campaigns.ownerId, ownerId)));
    return { updated: true as const, id: input.id };
  }
  const result = await db.insert(campaigns).values(values);
  return { created: true as const, id: Number(result[0].insertId) };
}

export async function getCampaign(ownerId: number, id: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(campaigns).where(and(eq(campaigns.id, id), eq(campaigns.ownerId, ownerId))).limit(1);
  return result[0];
}

export async function listEmailLogs(ownerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(emailLogs).where(eq(emailLogs.ownerId, ownerId)).orderBy(desc(emailLogs.createdAt)).limit(500);
}

export async function saveSmtpSettings(ownerId: number, input: { host: string; port: number; username: string; encryptedPassword: string; fromEmail: string; fromName: string }) {
  const db = await getDb(); if (!db) return { localOnly: true };
  const existing = await db.select().from(smtpSettings).where(eq(smtpSettings.ownerId, ownerId)).limit(1);
  if (existing[0]) await db.update(smtpSettings).set(input).where(eq(smtpSettings.ownerId, ownerId));
  else await db.insert(smtpSettings).values({ ownerId, ...input });
  return { saved: true as const };
}

export async function recordEmailLog(input: { campaignId?: number; ownerId: number; recipient: string; status: "sent" | "failed"; providerMessageId?: string; errorMessage?: string }) {
  const db = await getDb(); if (!db) return { localOnly: true };
  await db.insert(emailLogs).values({ ...input, sentAt: input.status === "sent" ? new Date() : null });
  return { saved: true as const };
}

export async function markCampaign(ownerId: number, id: number, status: "sending" | "sent" | "failed") {
  const db = await getDb(); if (!db) return { localOnly: true };
  await db.update(campaigns).set({ status, sentAt: status === "sent" ? new Date() : null }).where(and(eq(campaigns.id, id), eq(campaigns.ownerId, ownerId)));
  return { updated: true as const };
}

export async function getSmtpSettings(ownerId: number) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(smtpSettings).where(eq(smtpSettings.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function issueCertificate(userId: number, trackId: string, certificateCode: string) {
  const db = await getDb(); if (!db) return { localOnly: true, certificateCode };
  await db.insert(certificates).values({ userId, trackId, certificateCode });
  return { issued: true, certificateCode };
}
