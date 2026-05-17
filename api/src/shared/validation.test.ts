import { describe, expect, it } from "vitest";
import { z } from "zod";

const usernameSchema = z.string().regex(/^[A-Za-z0-9_-]+$/).min(3).max(32);

describe("username validation", () => {
  it("allows letters, numbers, dashes, and underscores", () => {
    expect(usernameSchema.safeParse("jane-user_10").success).toBe(true);
  });

  it("rejects spaces and punctuation", () => {
    expect(usernameSchema.safeParse("jane user!").success).toBe(false);
  });
});
