import { describe, expect, it } from "vitest";

import {
  defaultRules,
  describeReason,
  findPoison,
  isPoison,
  markPoison,
  noOverrides,
  POISON_GROUP_ID,
  poisonGroup,
  poisonJobs,
  poisonReasons,
  togglePoison,
} from "../src/poison";
import { makeJob } from "./job-factory";

describe("attempt threshold", () => {
  const jobs = [
    makeJob({ id: "low", attempts: 2, payloadText: '{"n":1}' }),
    makeJob({ id: "edge", attempts: 10, payloadText: '{"n":2}' }),
    makeJob({ id: "high", attempts: 25, payloadText: '{"n":3}' }),
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

describe("identical payload rule", () => {
  const declined = (id: string, payloadText: string, errorMessage = "card 4242 declined") =>
    makeJob({ id, errorClass: "CardDeclined", errorMessage, payloadText });

  it("flags every copy once the same payload fails the same way often enough", () => {
    const jobs = [
      declined("a", '{"order":1}'),
      declined("b", '{"order":1}', "card 1881 declined"),
      declined("c", '{"order":1}'),
      declined("d", '{"order":2}'),
    ];
    const report = findPoison(jobs);

    expect([...report.keys()]).toEqual(["a", "b", "c"]);
    expect(poisonReasons(report, "b")).toEqual([{ rule: "repeat", count: 3 }]);
  });

  it("does not count the same payload failing with a different error", () => {
    const jobs = [
      declined("a", '{"order":1}'),
      declined("b", '{"order":1}'),
      makeJob({ id: "c", errorClass: "TimeoutError", payloadText: '{"order":1}' }),
    ];

    expect(findPoison(jobs).size).toBe(0);
  });

  it("ignores surrounding whitespace in the payload", () => {
    const jobs = [declined("a", '{"order":1}'), declined("b", ' {"order":1}\n'), declined("c", '{"order":1}')];

    expect(findPoison(jobs).size).toBe(3);
  });

  it("can be turned off, and never fires below two copies", () => {
    const jobs = [declined("a", "{}"), declined("b", "{}"), declined("c", "{}")];

    expect(findPoison(jobs, { ...defaultRules, repeatCount: 0 }).size).toBe(0);
    expect(findPoison([declined("solo", "{}")], { ...defaultRules, repeatCount: 1 }).size).toBe(0);
  });

  it("lists both reasons when both rules fire", () => {
    const jobs = ["a", "b", "c"].map((id) =>
      makeJob({ id, errorClass: "CardDeclined", payloadText: "{}", attempts: 12 }),
    );

    expect(poisonReasons(findPoison(jobs), "a").map((reason) => reason.rule)).toEqual(["attempts", "repeat"]);
  });

  it("describes the reason", () => {
    expect(describeReason({ rule: "repeat", count: 4 })).toBe("same payload failed the same way 4 times");
  });
});

describe("manual overrides", () => {
  const jobs = [
    makeJob({ id: "worn", attempts: 14, payloadText: '{"n":1}' }),
    makeJob({ id: "fresh", attempts: 1, payloadText: '{"n":2}' }),
  ];
  const report = findPoison(jobs);

  it("follows the rules when there is no override", () => {
    expect(isPoison(report, noOverrides, "worn")).toBe(true);
    expect(isPoison(report, noOverrides, "fresh")).toBe(false);
  });

  it("lets an operator clear a flagged job or flag a clean one", () => {
    const overrides = markPoison(markPoison(noOverrides, "worn", "clear"), "fresh", "poison");

    expect(isPoison(report, overrides, "worn")).toBe(false);
    expect(isPoison(report, overrides, "fresh")).toBe(true);
    expect(poisonJobs(jobs, report, overrides).map((job) => job.id)).toEqual(["fresh"]);
  });

  it("hands a job back to the rules", () => {
    const overrides = markPoison(markPoison(noOverrides, "worn", "clear"), "worn", null);

    expect(overrides.size).toBe(0);
    expect(isPoison(report, overrides, "worn")).toBe(true);
  });

  it("toggles without leaving overrides that agree with the rules", () => {
    const cleared = togglePoison(report, noOverrides, "worn");
    const restored = togglePoison(report, cleared, "worn");

    expect(cleared.get("worn")).toBe("clear");
    expect(restored.size).toBe(0);
    expect(togglePoison(report, noOverrides, "fresh").get("fresh")).toBe("poison");
  });

  it("does not modify the previous overrides", () => {
    markPoison(noOverrides, "fresh", "poison");

    expect(noOverrides.size).toBe(0);
  });
});

describe("poisonGroup", () => {
  it("is absent when nothing is poison", () => {
    expect(poisonGroup([])).toBeNull();
  });

  it("collects poison jobs from different error groups", () => {
    const jobs = [
      makeJob({ id: "p-1", queue: "orders", errorClass: "TimeoutError", attempts: 11 }),
      makeJob({ id: "p-2", queue: "billing", errorClass: "CardDeclined", attempts: 4 }),
    ];
    const group = poisonGroup(jobs);

    expect(group?.id).toBe(POISON_GROUP_ID);
    expect(group?.count).toBe(2);
    expect(group?.maxAttempts).toBe(11);
    expect(group?.jobs.map((job) => job.id)).toEqual(["p-1", "p-2"]);
  });
});
