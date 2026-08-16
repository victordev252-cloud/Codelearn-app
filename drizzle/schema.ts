import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const lessonProgress = mysqlTable("lesson_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  lessonId: varchar("lessonId", { length: 128 }).notNull(),
  completed: boolean("completed").default(false).notNull(),
  quizScore: int("quizScore").default(0).notNull(),
  completedAt: timestamp("completedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectSubmissions = mysqlTable("project_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: varchar("projectId", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "submitted", "reviewed"]).default("not_started").notNull(),
  notes: text("notes"),
  submittedAt: timestamp("submittedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trackId: varchar("trackId", { length: 64 }).notNull(),
  certificateCode: varchar("certificateCode", { length: 64 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
});

export const subscribers = mysqlTable("subscribers", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  group: varchar("group", { length: 80 }).default("Newsletter").notNull(),
  status: mysqlEnum("status", ["active", "unsubscribed"]).default("active").notNull(),
  unsubscribeToken: varchar("unsubscribeToken", { length: 96 }).notNull().unique(),
  consentedAt: timestamp("consentedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  html: text("html").notNull(),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "failed"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId"),
  ownerId: int("ownerId").notNull(),
  recipient: varchar("recipient", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["queued", "sent", "failed", "bounced"]).default("queued").notNull(),
  providerMessageId: varchar("providerMessageId", { length: 255 }),
  errorMessage: varchar("errorMessage", { length: 500 }),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const smtpSettings = mysqlTable("smtp_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").default(587).notNull(),
  username: varchar("username", { length: 320 }).notNull(),
  encryptedPassword: text("encryptedPassword").notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type ProjectSubmission = typeof projectSubmissions.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type EmailLog = typeof emailLogs.$inferSelect;
export type SmtpSetting = typeof smtpSettings.$inferSelect;
