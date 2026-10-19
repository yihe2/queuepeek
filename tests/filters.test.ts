import { describe, expect, it } from "vitest";

import { emptyFilter, filterJobs, filterOptions, isFilterActive, matchesFilter } from "../src/filters";
import { makeJob } from "./job-factory";

const jobs = [
  makeJob({ id: "a", queue: "orders", errorClass: "TimeoutError", attempts: 1 }),
  makeJob({ id: "b", queue: "orders", errorClass: "CardDeclined", attempts: 5 }),
  makeJob({ id: "c", queue: "billing", errorClass: " TimeoutError ", attempts: 3 }),
  makeJob({ id: "d", queue: "", errorClass: "", attempts: 0 }),
];

const ids = (list: { id: string }[]) => list.map((job) => job.id);

describe("filterJobs", () => {
  it("returns every job for the empty filter", () => {
    expect(filterJobs(jobs, emptyFilter)).toBe(jobs);
  });

  it("filters by queue, including the empty queue", () => {
    expect(ids(filterJobs(jobs, { ...emptyFilter, queue: "orders" }))).toEqual(["a", "b"]);
    expect(ids(filterJobs(jobs, { ...emptyFilter, queue: "" }))).toEqual(["d"]);
  });

  it("filters by error class the same way grouping reads it", () => {
    expect(ids(filterJobs(jobs, { ...emptyFilter, errorClass: "TimeoutError" }))).toEqual(["a", "c"]);
  });

  it("filters by minimum attempts", () => {
    expect(ids(filterJobs(jobs, { ...emptyFilter, minAttempts: 3 }))).toEqual(["b", "c"]);
  });
});

describe("matchesFilter", () => {
  it("treats null as any value", () => {
    expect(matchesFilter(jobs[3], emptyFilter)).toBe(true);
  });
});

describe("isFilterActive", () => {
  it("is false only for the empty filter", () => {
    expect(isFilterActive(emptyFilter)).toBe(false);
    expect(isFilterActive({ ...emptyFilter, queue: "" })).toBe(true);
    expect(isFilterActive({ ...emptyFilter, minAttempts: 1 })).toBe(true);
  });
});

describe("filterOptions", () => {
  it("lists distinct queues and classes in a stable order", () => {
    expect(filterOptions(jobs)).toEqual({
      queues: ["", "billing", "orders"],
      classes: ["", "CardDeclined", "TimeoutError"],
    });
  });
});
