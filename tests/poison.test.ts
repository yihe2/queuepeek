import { describe, expect, it } from "vitest";

import { defaultRules, describeReason, findPoison, poisonReasons } from "../src/poison";
import { makeJob } from "./job-factory";

describe("attempt threshold", () => {
  const jobs = [
    makeJob({ id: "low", attempts: 2 }),
    makeJob({ id: "edge", attempts: 10 }),
    makeJob({ id: "high", attempts: 25 }),
  ];

  it("flags jobs at or above the limit", () => {
    const report = findPoison(jobs);

    expect([...report.keys()]).toEqual(["edge", "high"]);
    expect(poisonReasons(report, "high")).toEqual([{ rule: "attempts", attempts: 25, limit: 10 }]);
  });

  it("uses the configured limit", () => {
    expect([...findPoison(jobs, { ...defaultRules, maxAttempts: 3 }).keys()]).toEqual(["edge", "high"]);
    expect([...findPoison(jobs, { ...defaultRules, maxAttempts: 30 }).keys()]).toEqual([]);
  });

  it("can be turned off", () => {
    expect(findPoison(jobs, { ...defaultRules, maxAttempts: 0 }).size).toBe(0);
  });

  it("has no reasons for clean jobs", () => {
    expect(poisonReasons(findPoison(jobs), "low")).toEqual([]);
  });

  it("describes the reason", () => {
    expect(describeReason({ rule: "attempts", attempts: 25, limit: 10 })).toBe("25 attempts (limit 10)");
  });
});
