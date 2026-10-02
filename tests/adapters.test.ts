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

  it("routes Sidekiq records through the Sidekiq adapter", () => {
    const [job] = toJobs(
      [{ index: 0, record: { jid: "j-1", class: "OrderSync", args: [7], error_class: "Boom", retry_count: 3 } }],
      "sidekiq",
    );

    expect(job.producer).toBe("sidekiq");
    expect(job.id).toBe("j-1");
    expect(job.errorClass).toBe("Boom");
    expect(job.attempts).toBe(4);
    expect(job.payload).toEqual({ class: "OrderSync", args: [7] });
  });

  it("maps Redis-encoded generic records under the redis label", () => {
    const [job] = toJobs(
      [{ index: 0, encoded: true, record: { id: "job-1", payload: { orderId: 1 }, error: "Boom" } }],
      "redis",
    );

    expect(job.producer).toBe("redis");
    expect(job.errorClass).toBe("Boom");
    expect(job.payload).toEqual({ orderId: 1 });
  });
});
