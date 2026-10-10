import { describe, expect, it } from "vitest";

import { groupJobs } from "../src/grouping";
import { pickSample } from "../src/grouping/sample";
import { makeJob } from "./job-factory";

describe("pickSample", () => {
  it("picks the most repeated payload", () => {
    const repeated = makeJob({ payloadText: '{"orderId":1001}' });
    const jobs = [
      makeJob({ payloadText: '{"orderId":2044}' }),
      repeated,
      makeJob({ payloadText: '{"orderId":1001}' }),
    ];

    expect(pickSample(jobs)).toBe(repeated);
  });

  it("breaks ties by dump order", () => {
    const first = makeJob({ payloadText: '{"a":1}' });
    const jobs = [first, makeJob({ payloadText: '{"b":2}' })];

    expect(pickSample(jobs)).toBe(first);
  });

  it("returns the only job of a single-job group", () => {
    const only = makeJob();

    expect(pickSample([only])).toBe(only);
  });

  it("refuses an empty group", () => {
    expect(() => pickSample([])).toThrow("empty group");
  });

  it("attaches a sample to every group", () => {
    const groups = groupJobs([makeJob({ errorClass: "A" }), makeJob({ errorClass: "B" })]);

    expect(groups.every((group) => group.jobs.includes(group.sample))).toBe(true);
  });
});
