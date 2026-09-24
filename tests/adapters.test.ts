import { describe, expect, it } from "vitest";

import { toJobs } from "../src/adapters";

describe("toJobs", () => {
  it("routes SQS records through the SQS adapter", () => {
    const [job] = toJobs(
      [
        {
          index: 0,
          record: { MessageId: "m-1", Body: '{"orderId":1}', Attributes: { ApproximateReceiveCount: "4" } },
        },
      ],
      "sqs",
    );

    expect(job.producer).toBe("sqs");
    expect(job.attempts).toBe(4);
    expect(job.payload).toEqual({ orderId: 1 });
  });

  it("treats unknown producers as generic", () => {
    const [job] = toJobs([{ index: 0, record: { id: "job-1", payload: {} } }], "unknown");

    expect(job.producer).toBe("generic");
  });

  it("keeps the sidekiq label on the generic mapping until its adapter lands", () => {
    const [job] = toJobs(
      [{ index: 0, record: { jid: "j-1", class: "OrderSync", args: [], error_class: "Boom", retry_count: 3 } }],
      "sidekiq",
    );

    expect(job.producer).toBe("sidekiq");
    expect(job.id).toBe("j-1");
    expect(job.errorClass).toBe("Boom");
    expect(job.attempts).toBe(3);
  });
});
