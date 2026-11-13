import { describe, expect, it } from "vitest";

import { vendorIds } from "../src/export/vendor";
import { makeJob } from "./job-factory";

describe("vendorIds", () => {
  it("keeps the SQS message id, receipt handle, and body hash", () => {
    const job = makeJob({
      producer: "sqs",
      raw: { MessageId: "5f1c-msg", ReceiptHandle: "AQEB-handle", MD5OfBody: "9e107d9d" },
    });

    expect(vendorIds(job)).toEqual({ messageId: "5f1c-msg", receiptHandle: "AQEB-handle", md5OfBody: "9e107d9d" });
  });

  it("leaves out SQS fields the dump did not have", () => {
    const job = makeJob({ producer: "sqs", raw: { MessageId: "5f1c-msg" } });

    expect(vendorIds(job)).toEqual({ messageId: "5f1c-msg" });
  });

  it("keeps the Sidekiq jid, enqueued class, and queue", () => {
    const job = makeJob({
      producer: "sidekiq",
      raw: {
        jid: "b4a5f3c2e1d0",
        class: "ActiveJob::QueueAdapters::SidekiqAdapter::JobWrapper",
        wrapped: "ChargeCardJob",
        queue: "billing",
      },
    });

    expect(vendorIds(job)).toEqual({
      jid: "b4a5f3c2e1d0",
      class: "ActiveJob::QueueAdapters::SidekiqAdapter::JobWrapper",
      queue: "billing",
    });
  });

  it("has nothing extra for generic and Redis jobs", () => {
    expect(vendorIds(makeJob({ producer: "generic", raw: { id: "g-1" } }))).toEqual({});
    expect(vendorIds(makeJob({ producer: "redis", raw: { jid: "x" } }))).toEqual({});
  });
});
