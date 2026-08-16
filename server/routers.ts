import { z } from "zod";
import { lessons } from "@shared/curriculum";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { addSubscriber, getCampaign, getCertificate, getProgress, getProjectSubmissions, getSmtpSettings, issueCertificate, listCampaigns, listEmailLogs, listSubscribers, markCampaign, recordEmailLog, saveCampaign, saveLessonProgress, saveProjectSubmission, saveSmtpSettings, toggleSubscriber, unsubscribeByToken } from "./db";
import { ENV } from "./_core/env";
import { decryptSecret, encryptSecret, sendHtmlEmail, verifySmtp } from "./email";

const tutorInput = z.object({ lessonTitle: z.string(), lessonDescription: z.string(), lessonCode: z.string().optional(), question: z.string().min(2) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  learning: router({
    progress: protectedProcedure.query(({ ctx }) => getProgress(ctx.user.id)),
    saveProgress: protectedProcedure.input(z.object({ lessonId: z.string(), completed: z.boolean(), quizScore: z.number().min(0).max(100).default(0) })).mutation(({ ctx, input }) => saveLessonProgress(ctx.user.id, input.lessonId, input.completed, input.quizScore)),
    submitProject: protectedProcedure.input(z.object({ projectId: z.string(), status: z.enum(["not_started", "in_progress", "submitted", "reviewed"]), notes: z.string().optional() })).mutation(({ ctx, input }) => saveProjectSubmission(ctx.user.id, input.projectId, input.status, input.notes)),
    submissions: protectedProcedure.query(({ ctx }) => getProjectSubmissions(ctx.user.id)),
    certificate: protectedProcedure.input(z.object({ trackId: z.string() })).query(async ({ ctx, input }) => {
      const trackLessons = lessons.filter(lesson => lesson.track === input.trackId);
      const progress = await getProgress(ctx.user.id);
      const completed = progress.filter(item => item.completed && trackLessons.some(lesson => lesson.id === item.lessonId));
      const certificate = await getCertificate(ctx.user.id, input.trackId);
      return { eligible: trackLessons.length > 0 && completed.length >= trackLessons.length, completedCount: completed.length, totalCount: trackLessons.length, certificate: certificate ?? null };
    }),
    issueCertificate: protectedProcedure.input(z.object({ trackId: z.string() })).mutation(async ({ ctx, input }) => {
      const trackLessons = lessons.filter(lesson => lesson.track === input.trackId);
      const progress = await getProgress(ctx.user.id);
      const completed = progress.filter(item => item.completed && trackLessons.some(lesson => lesson.id === item.lessonId));
      if (!trackLessons.length || completed.length < trackLessons.length) return { eligible: false, certificateCode: null };
      const certificateCode = `CMA-${input.trackId.toUpperCase()}-${ctx.user.id}-${Date.now().toString(36).toUpperCase()}`;
      return issueCertificate(ctx.user.id, input.trackId, certificateCode);
    }),
  }),
  subscribers: router({
    list: protectedProcedure.query(({ ctx }) => listSubscribers(ctx.user.id)),
    add: protectedProcedure.input(z.object({ name: z.string().min(1).max(160), email: z.string().email(), group: z.string().max(80).optional() })).mutation(({ ctx, input }) => addSubscriber(ctx.user.id, input)),
    toggle: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => toggleSubscriber(ctx.user.id, input.id)),
  }),
  campaigns: router({
    list: protectedProcedure.query(({ ctx }) => listCampaigns(ctx.user.id)),
    save: protectedProcedure.input(z.object({ id: z.number().int().positive().optional(), name: z.string().min(1).max(180), subject: z.string().min(1).max(200), html: z.string().min(1), status: z.enum(["draft", "scheduled"]).optional() })).mutation(({ ctx, input }) => saveCampaign(ctx.user.id, input)),
    logs: protectedProcedure.query(({ ctx }) => listEmailLogs(ctx.user.id)),
    send: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const campaign = await getCampaign(ctx.user.id, input.id);
      if (!campaign) throw new Error("Campaign not found.");
      const audience = (await listSubscribers(ctx.user.id)).filter(item => item.status === "active");
      if (!audience.length) throw new Error("No active subscribers are available for this campaign.");
      const stored = await getSmtpSettings(ctx.user.id);
      const smtp = stored ? { host: stored.host, port: stored.port, username: stored.username, password: decryptSecret(stored.encryptedPassword), secure: stored.port === 465 } : { host: ENV.smtpHost, port: ENV.smtpPort, username: ENV.smtpUsername, password: ENV.smtpPassword, secure: ENV.smtpPort === 465 };
      const fromEmail = stored?.fromEmail ?? ENV.smtpFrom;
      if (!smtp.host || !smtp.username || !smtp.password || !fromEmail) throw new Error("SMTP settings are incomplete.");
      await markCampaign(ctx.user.id, campaign.id, "sending");
      let sent = 0; let failed = 0;
      for (const subscriber of audience) {
        const html = campaign.html.replaceAll("{{unsubscribe_url}}", `${ENV.appUrl}/unsubscribe/${subscriber.unsubscribeToken}`);
        try {
          const result = await sendHtmlEmail({ smtp, from: fromEmail, to: subscriber.email, subject: campaign.subject, html });
          await recordEmailLog({ campaignId: campaign.id, ownerId: ctx.user.id, recipient: subscriber.email, status: "sent", providerMessageId: result.messageId });
          sent += 1;
        } catch (error) {
          await recordEmailLog({ campaignId: campaign.id, ownerId: ctx.user.id, recipient: subscriber.email, status: "failed", errorMessage: error instanceof Error ? error.message.slice(0, 480) : "Delivery failed" });
          failed += 1;
        }
      }
      await markCampaign(ctx.user.id, campaign.id, failed === audience.length ? "failed" : "sent");
      return { sent, failed, total: audience.length };
    }),
  }),
  unsubscribe: publicProcedure.input(z.object({ token: z.string().min(32).max(96) })).mutation(({ input }) => unsubscribeByToken(input.token)),
  email: router({
    settings: protectedProcedure.query(async ({ ctx }) => {
      const result = await getSmtpSettings(ctx.user.id);
      return result ? { host: result.host, port: result.port, username: result.username, fromEmail: result.fromEmail, fromName: result.fromName } : null;
    }),
    saveSettings: protectedProcedure.input(z.object({ host: z.string().min(1), port: z.number().int().min(1).max(65535), username: z.string().email(), password: z.string().min(1), fromEmail: z.string().email(), fromName: z.string().min(1).max(160) })).mutation(async ({ ctx, input }) => {
      await verifySmtp({ host: input.host, port: input.port, username: input.username, password: input.password, secure: input.port === 465 });
      return saveSmtpSettings(ctx.user.id, { host: input.host, port: input.port, username: input.username, encryptedPassword: encryptSecret(input.password), fromEmail: input.fromEmail, fromName: input.fromName });
    }),
    verify: protectedProcedure.input(z.object({ host: z.string().min(1), port: z.number().int().min(1).max(65535), username: z.string().email(), password: z.string().min(1), secure: z.boolean().optional() })).mutation(async ({ input }) => {
      await verifySmtp(input);
      return { verified: true as const };
    }),
    sendTest: protectedProcedure.input(z.object({ to: z.string().email(), subject: z.string().min(1).max(200), html: z.string().min(1), smtp: z.object({ host: z.string().min(1), port: z.number().int().min(1).max(65535), username: z.string().email(), password: z.string().min(1), secure: z.boolean().optional() }).optional() })).mutation(async ({ input }) => {
      const smtp = input.smtp ?? { host: ENV.smtpHost, port: ENV.smtpPort, username: ENV.smtpUsername, password: ENV.smtpPassword, secure: ENV.smtpPort === 465 };
      if (!smtp.host || !smtp.username || !smtp.password || !ENV.smtpFrom) throw new Error("SMTP settings are incomplete. Configure SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM.");
      return sendHtmlEmail({ smtp, from: ENV.smtpFrom, to: input.to, subject: input.subject, html: input.html });
    }),
  }),
  tutor: router({
    ask: protectedProcedure.input(tutorInput).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are CodeMaster Academy's patient coding tutor. The learner is studying the lesson titled "${input.lessonTitle}". Lesson context: ${input.lessonDescription}. Keep answers practical, warm, and concise. If code is provided, explain the issue and suggest a corrected direction without doing the whole exercise for them. Current lesson code: ${input.lessonCode ?? "No code supplied."}` },
          { role: "user", content: input.question },
        ],
      });
      const content = response.choices?.[0]?.message?.content;
      return { answer: typeof content === "string" ? content : "I could not form a response just now. Try asking the question another way." };
    }),
  }),
});

export type AppRouter = typeof appRouter;
