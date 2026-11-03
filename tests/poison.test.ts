import { describe, expect, it } from "vitest";

import { defaultRules, describeReason, findPoison, poisonReasons } from "../src/poison";
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
