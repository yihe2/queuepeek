import { describe, expect, it } from "vitest";

import { detectDumpFormat, fingerprintRecord } from "../src/detect";

describe("fingerprintRecord", () => {
  it("detects SQS records from MessageId and Body", () => {
    expect(fingerprintRecord({ MessageId: "abc", Body: "{\"ok\":true}" })).toBe("sqs");
  });

  it("detects Sidekiq dead records from error_class", () => {
    expect(
      fingerprintRecord({
        jid: "jid-1",
        queue: "mailers",
        class: "WelcomeMailer",
        args: [],
        error_class: "TimeoutError",
      }),
    ).toBe("sidekiq");
  });

  it("detects Sidekiq jobs without error fields from class and args", () => {
    expect(fingerprintRecord({ class: "OrderSyncJob", args: [1001], queue: "default" })).toBe("sidekiq");
  });

  it("detects generic records from payload or error", () => {
    expect(fingerprintRecord({ id: "job-1", payload: { orderId: 9 }, error: "Timeout" })).toBe("generic");
  });

  it("detects generic records that only carry attempts", () => {
    expect(fingerprintRecord({ id: "job-1", attempts: 3 })).toBe("generic");
  });

  it("returns unknown for unrelated objects", () => {
    expect(fingerprintRecord({ foo: 1 })).toBe("unknown");
  });
});

describe("detectDumpFormat", () => {
  it("returns unknown for an empty dump", () => {
    expect(detectDumpFormat([])).toEqual({ producer: "unknown", mismatches: 0, sampled: 0 });
  });

  it("counts mismatches when a later record disagrees", () => {
    const result = detectDumpFormat([
      { MessageId: "1", Body: "{}" },
      { id: "job-1", payload: {}, error: "Timeout" },
    ]);

    expect(result).toEqual({ producer: "sqs", mismatches: 1, sampled: 2 });
  });

  it("labels encoded generic dumps as redis", () => {
    const result = detectDumpFormat([{ id: "job-1", payload: {} }], { encoded: true });

    expect(result.producer).toBe("redis");
  });

  it("keeps the Sidekiq label for Redis-encoded Sidekiq jobs", () => {
    const result = detectDumpFormat([{ class: "X", args: [], error_class: "Boom" }], { encoded: true });

    expect(result.producer).toBe("sidekiq");
  });

  it("does not call an empty encoded dump redis", () => {
    expect(detectDumpFormat([], { encoded: true }).producer).toBe("unknown");
  });
});
