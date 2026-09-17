import { describe, expect, it } from "vitest";

import { normalizeGenericRecord, normalizeRecords } from "../src/normalize";

describe("normalizeGenericRecord", () => {
  it("maps a canonical generic record", () => {
    const job = normalizeGenericRecord({
      index: 0,
      line: 1,
      record: {
        id: "job-1",
        queue: "orders",
        payload: { orderId: 1001 },
        error: { class: "TimeoutError", message: "payment gateway timeout" },
        attempts: 8,
        failedAt: "2026-09-08T14:02:11Z",
      },
    });

    expect(job.id).toBe("job-1");
    expect(job.queue).toBe("orders");
    expect(job.errorClass).toBe("TimeoutError");
    expect(job.errorMessage).toBe("payment gateway timeout");
    expect(job.attempts).toBe(8);
    expect(job.payloadText).toBe('{"orderId":1001}');
  });

  it("accepts a bare error string", () => {
    const job = normalizeGenericRecord({
      index: 0,
      record: { id: "job-3", error: "SMTPConnectionError" },
    });

    expect(job.errorClass).toBe("SMTPConnectionError");
    expect(job.errorMessage).toBe("");
  });

  it("falls back to a positional id and zero attempts", () => {
    const job = normalizeGenericRecord({ index: 4, record: { payload: {} } });

    expect(job.id).toBe("record-4");
    expect(job.attempts).toBe(0);
  });

  it("keeps the untouched vendor record on raw", () => {
    const record = { id: "job-1", MessageId: "m-1", payload: {} };
    const job = normalizeGenericRecord({ index: 0, record });

    expect(job.raw).toBe(record);
    expect(job.raw.MessageId).toBe("m-1");
  });

  it("treats the whole record as payload when there is no payload key", () => {
    const job = normalizeGenericRecord({ index: 0, record: { id: "job-1", orderId: 7 } });

    expect(job.payloadText).toContain('"orderId":7');
  });
});

describe("normalizeRecords", () => {
  it("tags every job with the detected producer", () => {
    const jobs = normalizeRecords(
      [
        { index: 0, record: { id: "a" } },
        { index: 1, record: { id: "b" } },
      ],
      "sqs",
    );

    expect(jobs.map((job) => job.producer)).toEqual(["sqs", "sqs"]);
  });
});
