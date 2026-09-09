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

  it("detects generic records from payload or error", () => {
    expect(fingerprintRecord({ id: "job-1", payload: { orderId: 9 }, error: "Timeout" })).toBe("generic");
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
});
