import { describe, expect, it } from "vitest";

import { summarizeJobs } from "../src/grouping/summary";
import { makeJob } from "./job-factory";

describe("summarizeJobs", () => {
  it("counts jobs and lists queues with the busiest first", () => {
    const summary = summarizeJobs([
      makeJob({ queue: "refunds" }),
      makeJob({ queue: "orders" }),
      makeJob({ queue: "orders" }),
    ]);

    expect(summary.count).toBe(3);
    expect(summary.queues).toEqual([
      { queue: "orders", count: 2 },
      { queue: "refunds", count: 1 },
    ]);
  });

  it("breaks queue ties by name", () => {
    const summary = summarizeJobs([makeJob({ queue: "mailers" }), makeJob({ queue: "imports" })]);

    expect(summary.queues.map((entry) => entry.queue)).toEqual(["imports", "mailers"]);
  });

  it("tracks the highest attempt count", () => {
    const summary = summarizeJobs([makeJob({ attempts: 3 }), makeJob({ attempts: 25 }), makeJob({ attempts: 1 })]);

    expect(summary.maxAttempts).toBe(25);
  });

  it("finds the first and last failure, skipping missing or unreadable times", () => {
    const summary = summarizeJobs([
      makeJob({ failedAt: "2026-10-01T16:03:55Z" }),
      makeJob({ failedAt: "" }),
      makeJob({ failedAt: "2026-10-01T15:12:40Z" }),
      makeJob({ failedAt: "yesterday-ish" }),
      makeJob({ failedAt: "2026-10-01T15:19:02Z" }),
    ]);

    expect(summary.firstFailedAt).toBe("2026-10-01T15:12:40Z");
    expect(summary.lastFailedAt).toBe("2026-10-01T16:03:55Z");
  });

  it("returns an empty summary for no jobs", () => {
    expect(summarizeJobs([])).toEqual({
      count: 0,
      queues: [],
      maxAttempts: 0,
      firstFailedAt: "",
      lastFailedAt: "",
    });
  });
});
