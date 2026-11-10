import { describe, expect, it } from "vitest";

import { noEdits, setIncluded } from "../src/edits";
import { partitionJobs } from "../src/export/partition";
import { makeJob } from "./job-factory";

const jobs = ["a", "b", "c", "d", "e"].map((id) => makeJob({ id }));
const poisonIds = new Set(["c", "d"]);
const poisoned = (jobId: string) => poisonIds.has(jobId);
const ids = (list: { id: string }[]) => list.map((job) => job.id);

describe("partitionJobs", () => {
  it("puts ticked jobs in retry, untouched poison in poison, and the rest in leftover", () => {
    const parts = partitionJobs(jobs, setIncluded(noEdits, ["a", "d"], true), poisoned);

    expect(ids(parts.retry)).toEqual(["a", "d"]);
    expect(ids(parts.poison)).toEqual(["c"]);
    expect(ids(parts.leftover)).toEqual(["b", "e"]);
  });

  it("accounts for every job exactly once", () => {
    const parts = partitionJobs(jobs, setIncluded(noEdits, ["b", "c"], true), poisoned);
    const all = [...parts.retry, ...parts.poison, ...parts.leftover];

    expect(ids(all).sort()).toEqual(ids(jobs));
  });

  it("keeps dump order inside each part", () => {
    const parts = partitionJobs([...jobs].reverse(), noEdits, poisoned);

    expect(ids(parts.leftover)).toEqual(["e", "b", "a"]);
  });

  it("leaves everything in leftover when nothing is ticked or poison", () => {
    expect(ids(partitionJobs(jobs, noEdits, () => false).leftover)).toEqual(ids(jobs));
  });
});
