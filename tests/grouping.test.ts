import { describe, expect, it } from "vitest";

import { groupJobs, groupLabel } from "../src/grouping";
import { makeJob } from "./job-factory";

describe("groupJobs", () => {
  it("returns no groups for no jobs", () => {
    expect(groupJobs([])).toEqual([]);
  });

  it("groups jobs that share an error class", () => {
    const groups = groupJobs([
      makeJob({ errorClass: "TimeoutError" }),
      makeJob({ errorClass: "TimeoutError" }),
      makeJob({ errorClass: "CardDeclined" }),
    ]);

    expect(groups.map((group) => [group.errorClass, group.jobs.length])).toEqual([
      ["TimeoutError", 2],
      ["CardDeclined", 1],
    ]);
  });

  it("trims whitespace around the error class", () => {
    const groups = groupJobs([makeJob({ errorClass: " TimeoutError " }), makeJob({ errorClass: "TimeoutError" })]);

    expect(groups).toHaveLength(1);
  });

  it("collects jobs without an error into one group", () => {
    const groups = groupJobs([makeJob(), makeJob({ errorClass: "  " })]);

    expect(groups).toHaveLength(1);
    expect(groupLabel(groups[0])).toBe("(no error)");
  });
});
