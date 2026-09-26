import { describe, expect, it } from "vitest";

import { sqsIdentity } from "../src/adapters/identity";
import { normalizeSqsRecord } from "../src/adapters/sqs";
import { normalizeGenericRecord } from "../src/normalize";

describe("sqsIdentity", () => {
  it("returns the message id and receipt handle from raw", () => {
    const job = normalizeSqsRecord({
      index: 0,
      record: { MessageId: "m-1", ReceiptHandle: "AQEB-handle", Body: "{}" },
    });

    expect(sqsIdentity(job)).toEqual({ messageId: "m-1", receiptHandle: "AQEB-handle" });
  });

  it("returns an empty receipt handle when the export dropped it", () => {
    const job = normalizeSqsRecord({ index: 0, record: { MessageId: "m-1", Body: "{}" } });

    expect(sqsIdentity(job)?.receiptHandle).toBe("");
  });

  it("returns null for jobs from other producers", () => {
    const job = normalizeGenericRecord({ index: 0, record: { id: "job-1", MessageId: "m-1" } });

    expect(sqsIdentity(job)).toBeNull();
  });

  it("returns null when the SQS record had no MessageId", () => {
    const job = normalizeSqsRecord({ index: 3, record: { Body: "{}" } });

    expect(sqsIdentity(job)).toBeNull();
  });
});
