import { z } from "zod";
import { lessons } from "@shared/curriculum";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getCertificate, getProgress, getProjectSubmissions, issueCertificate, saveLessonProgress, saveProjectSubmission } from "./db";

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
