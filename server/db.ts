import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { certificates, InsertUser, lessonProgress, projectSubmissions, users } from "../drizzle/schema";
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

export async function issueCertificate(userId: number, trackId: string, certificateCode: string) {
  const db = await getDb(); if (!db) return { localOnly: true, certificateCode };
  await db.insert(certificates).values({ userId, trackId, certificateCode });
  return { issued: true, certificateCode };
}
