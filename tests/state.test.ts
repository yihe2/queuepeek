import { describe, expect, it } from "vitest";

import { groupJobs } from "../src/grouping";
import { emptyState, loadGroups, selectedGroup, selectedJob, selectGroup, selectJob } from "../src/state";
import { makeJob } from "./job-factory";

const timeouts = [
  makeJob({ id: "t-1", errorClass: "TimeoutError", payloadText: "a" }),
  makeJob({ id: "t-2", errorClass: "TimeoutError", payloadText: "b" }),
  makeJob({ id: "t-3", errorClass: "TimeoutError", payloadText: "b" }),
];
const declines = [makeJob({ id: "d-1", errorClass: "CardDeclined" })];

describe("loadGroups", () => {
  it("selects the largest group and its sample job", () => {
    const state = loadGroups(groupJobs([...declines, ...timeouts]));

    expect(selectedGroup(state)?.errorClass).toBe("TimeoutError");
    expect(state.selectedJobId).toBe("t-2");
  });

  it("selects nothing for an empty dump", () => {
    expect(loadGroups([])).toEqual(emptyState);
  });

  it("keeps the selected group across a reload when it still exists", () => {
    const first = selectGroup(loadGroups(groupJobs([...timeouts, ...declines])), groupJobs(declines)[0].id);
    const reloaded = loadGroups(groupJobs([...timeouts, ...declines, makeJob({ errorClass: "CardDeclined" })]), first);

    expect(selectedGroup(reloaded)?.errorClass).toBe("CardDeclined");
  });

  it("keeps the selected job when it is still in the kept group", () => {
    const first = selectJob(loadGroups(groupJobs(timeouts)), "t-3");
    const narrowed = loadGroups(groupJobs(timeouts.filter((job) => job.id !== "t-1")), first);

    expect(narrowed.selectedJobId).toBe("t-3");
  });

  it("moves to the group's sample when the selected job was filtered out", () => {
    const first = selectJob(loadGroups(groupJobs(timeouts)), "t-1");
    const narrowed = loadGroups(groupJobs(timeouts.filter((job) => job.id !== "t-1")), first);

    expect(narrowed.selectedJobId).toBe("t-2");
  });

  it("falls back to the largest group when the previous one is gone", () => {
    const first = selectGroup(loadGroups(groupJobs([...timeouts, ...declines])), groupJobs(declines)[0].id);
    const reloaded = loadGroups(groupJobs(timeouts), first);

    expect(selectedGroup(reloaded)?.errorClass).toBe("TimeoutError");
  });
});

describe("selectGroup", () => {
  it("moves to the group and its sample job", () => {
    const state = loadGroups(groupJobs([...timeouts, ...declines]));
    const next = selectGroup(state, groupJobs(declines)[0].id);

    expect(selectedJob(next)?.id).toBe("d-1");
  });

  it("ignores unknown group ids", () => {
    const state = loadGroups(groupJobs(timeouts));

    expect(selectGroup(state, "g-missing")).toBe(state);
  });
});

describe("selectJob", () => {
  it("selects a job inside the current group", () => {
    const state = loadGroups(groupJobs(timeouts));

    expect(selectedJob(selectJob(state, "t-1"))?.id).toBe("t-1");
  });

  it("ignores jobs from other groups", () => {
    const state = loadGroups(groupJobs([...timeouts, ...declines]));

    expect(selectJob(state, "d-1")).toBe(state);
  });
});
