import { describe, expect, it } from "vitest";

import { emptyFilter, filterJobs, filterOptions, isFilterActive, matchesFilter, matchesText } from "../src/filters";
import { groupJobs } from "../src/grouping";
import { makeJob } from "./job-factory";

const jobs = [
  makeJob({
    id: "a",
    queue: "orders",
    errorClass: "TimeoutError",
    errorMessage: "Task timed out after 30.00 seconds",
    attempts: 1,
    payloadText: '{"orderId":"ord_1001"}',
  }),
  makeJob({
    id: "b",
    queue: "orders",
    errorClass: "CardDeclined",
    errorMessage: "insufficient funds",
    attempts: 5,
    payloadText: '{"orderId":"ord_1002","customer":"acme"}',
  }),
  makeJob({
    id: "c",
    queue: "billing",
    errorClass: " TimeoutError ",
    errorMessage: "Task timed out after 12.50 seconds",
    attempts: 3,
    payloadText: '{"invoice":77}',
  }),
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

describe("matchesText", () => {
  it("matches payload text and error message, ignoring case", () => {
    expect(ids(jobs.filter((job) => matchesText(job, "ACME")))).toEqual(["b"]);
    expect(ids(jobs.filter((job) => matchesText(job, "after 30")))).toEqual(["a"]);
  });

  it("matches the job id and error class", () => {
    expect(matchesText(jobs[2], "c")).toBe(true);
    expect(matchesText(jobs[1], "declined")).toBe(true);
  });

  it("treats blank text as no search", () => {
    expect(jobs.every((job) => matchesText(job, "   "))).toBe(true);
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
    expect(isFilterActive({ ...emptyFilter, text: "ord" })).toBe(true);
    expect(isFilterActive({ ...emptyFilter, text: "  " })).toBe(false);
  });
});

describe("filter composition", () => {
  it("requires every active filter to match", () => {
    expect(ids(filterJobs(jobs, { ...emptyFilter, queue: "orders", minAttempts: 2 }))).toEqual(["b"]);
    expect(ids(filterJobs(jobs, { ...emptyFilter, errorClass: "TimeoutError", text: "invoice" }))).toEqual(["c"]);
  });

  it("can narrow to nothing", () => {
    expect(filterJobs(jobs, { ...emptyFilter, queue: "billing", errorClass: "CardDeclined" })).toEqual([]);
  });

  it("gives the same result whatever order the filters are applied in", () => {
    const steps = [
      { ...emptyFilter, queue: "orders" },
      { ...emptyFilter, text: "ord_" },
      { ...emptyFilter, minAttempts: 1 },
    ];
    const combined = { ...emptyFilter, queue: "orders", text: "ord_", minAttempts: 1 };
    const forward = steps.reduce((list, step) => filterJobs(list, step), jobs);
    const backward = [...steps].reverse().reduce((list, step) => filterJobs(list, step), jobs);

    expect(ids(forward)).toEqual(ids(filterJobs(jobs, combined)));
    expect(ids(backward)).toEqual(ids(forward));
  });

  it("keeps group ids stable when a filter shrinks a group", () => {
    const all = groupJobs(jobs);
    const filtered = groupJobs(filterJobs(jobs, { ...emptyFilter, queue: "orders" }));
    const timeoutsAll = all.find((group) => group.errorClass === "TimeoutError");
    const timeoutsFiltered = filtered.find((group) => group.errorClass === "TimeoutError");

    expect(timeoutsAll?.count).toBe(2);
    expect(timeoutsFiltered?.count).toBe(1);
    expect(timeoutsFiltered?.id).toBe(timeoutsAll?.id);
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
