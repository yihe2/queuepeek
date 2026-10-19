import { describe, expect, it } from "vitest";

import { dumpOrder, nextSort, sortJobs } from "../src/sorting";
import { makeJob } from "./job-factory";

const jobs = [
  makeJob({ id: "a", queue: "orders", attempts: 2, failedAt: "2026-10-02T10:00:00Z" }),
  makeJob({ id: "b", queue: "billing", attempts: 5, failedAt: "" }),
  makeJob({ id: "c", queue: "orders", attempts: 2, failedAt: "2026-10-01T09:30:00Z" }),
  makeJob({ id: "d", queue: "audit", attempts: 1, failedAt: "yesterday" }),
];

const ids = (list: { id: string }[]) => list.map((job) => job.id);

describe("sortJobs", () => {
  it("keeps dump order by default and can reverse it", () => {
    expect(sortJobs(jobs, dumpOrder)).toBe(jobs);
    expect(ids(sortJobs(jobs, { key: "dump", direction: "desc" }))).toEqual(["d", "c", "b", "a"]);
  });

  it("sorts by queue, keeping dump order for ties", () => {
    expect(ids(sortJobs(jobs, { key: "queue", direction: "asc" }))).toEqual(["d", "b", "a", "c"]);
    expect(ids(sortJobs(jobs, { key: "queue", direction: "desc" }))).toEqual(["a", "c", "b", "d"]);
  });

  it("sorts by attempts", () => {
    expect(ids(sortJobs(jobs, { key: "attempts", direction: "desc" }))).toEqual(["b", "a", "c", "d"]);
  });

  it("puts unreadable failure times last in both directions", () => {
    expect(ids(sortJobs(jobs, { key: "failedAt", direction: "asc" }))).toEqual(["c", "a", "b", "d"]);
    expect(ids(sortJobs(jobs, { key: "failedAt", direction: "desc" }))).toEqual(["a", "c", "b", "d"]);
  });

  it("does not modify the input", () => {
    sortJobs(jobs, { key: "attempts", direction: "asc" });

    expect(ids(jobs)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("nextSort", () => {
  it("cycles ascending, descending, then dump order", () => {
    const first = nextSort(dumpOrder, "attempts");
    const second = nextSort(first, "attempts");

    expect(first).toEqual({ key: "attempts", direction: "asc" });
    expect(second).toEqual({ key: "attempts", direction: "desc" });
    expect(nextSort(second, "attempts")).toEqual(dumpOrder);
  });

  it("starts a new column ascending", () => {
    expect(nextSort({ key: "queue", direction: "desc" }, "failedAt")).toEqual({ key: "failedAt", direction: "asc" });
  });
});
