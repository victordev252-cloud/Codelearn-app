import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 987654,
    openId: "learning-test-user",
    email: "learning@example.com",
    name: "Learning Test",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("learning procedures", () => {
  it("loads progress and project submissions through protected procedures", async () => {
    const caller = appRouter.createCaller(createContext());
    const progress = await caller.learning.progress();
    const submissions = await caller.learning.submissions();
    expect(Array.isArray(progress)).toBe(true);
    expect(Array.isArray(submissions)).toBe(true);
  });

  it("does not unlock a certificate when a track is incomplete", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.learning.certificate({ trackId: "html" });
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.eligible).toBe(false);
    expect(result.completedCount).toBeLessThan(result.totalCount);
  });

  it("rejects issuing a certificate before all lessons are complete", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.learning.issueCertificate({ trackId: "html" });
    expect(result.eligible).toBe(false);
    expect(result.certificateCode).toBeNull();
  });
});
