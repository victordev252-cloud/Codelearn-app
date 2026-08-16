import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessons } from "@shared/curriculum";

const saveLessonProgress = vi.fn();
const saveProjectSubmission = vi.fn();
const issueCertificate = vi.fn();
const getProgress = vi.fn();
const getCertificate = vi.fn();
const getProjectSubmissions = vi.fn();

vi.mock("./db", () => ({ getProgress, getCertificate, getProjectSubmissions, issueCertificate, saveLessonProgress, saveProjectSubmission }));

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
function context(): TrpcContext {
  const user: AuthenticatedUser = { id: 22, openId: "write-test", email: "write@example.com", name: "Write Test", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  return { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as TrpcContext["res"] };
}

describe("learning write procedures", () => {
  beforeEach(() => { vi.clearAllMocks(); saveLessonProgress.mockResolvedValue({ saved: true }); saveProjectSubmission.mockResolvedValue({ saved: true }); issueCertificate.mockResolvedValue({ issued: true, certificateCode: "CMA-HTML-22-TEST" }); getCertificate.mockResolvedValue(undefined); });

  it("saves lesson progress and quiz score", async () => {
    const caller = appRouter.createCaller(context());
    await caller.learning.saveProgress({ lessonId: "html-document-structure", completed: true, quizScore: 100 });
    expect(saveLessonProgress).toHaveBeenCalledWith(22, "html-document-structure", true, 100);
  });

  it("writes a project submission", async () => {
    const caller = appRouter.createCaller(context());
    await caller.learning.submitProject({ projectId: "profile-page", status: "submitted", notes: "Ready for review" });
    expect(saveProjectSubmission).toHaveBeenCalledWith(22, "profile-page", "submitted", "Ready for review");
  });

  it("issues a certificate only after every track lesson is complete", async () => {
    getProgress.mockResolvedValue(lessons.filter(lesson => lesson.track === "html").map(lesson => ({ lessonId: lesson.id, completed: true, quizScore: 100 })));
    const caller = appRouter.createCaller(context());
    const result = await caller.learning.issueCertificate({ trackId: "html" });
    expect(result).toEqual({ issued: true, certificateCode: "CMA-HTML-22-TEST" });
    expect(issueCertificate).toHaveBeenCalledWith(22, "html", expect.stringMatching(/^CMA-HTML-22-/));
  });
});
