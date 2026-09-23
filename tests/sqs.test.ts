import { describe, expect, it } from "vitest";

import { normalizeSqsRecord } from "../src/adapters/sqs";

function sqs(record: Record<string, unknown>, index = 0) {
  return normalizeSqsRecord({ index, record });
}

describe("normalizeSqsRecord body shapes", () => {
  it("parses a JSON string body and keeps the original text", () => {
    const job = sqs({ MessageId: "m-1", Body: '{"orderId":1001}' });

    expect(job.payload).toEqual({ orderId: 1001 });
    expect(job.payloadText).toBe('{"orderId":1001}');
  });

  it("keeps a plain string body as a string", () => {
    const job = sqs({ MessageId: "m-1", Body: "legacy order ping 1012" });

    expect(job.payload).toBe("legacy order ping 1012");
  });

  it("keeps malformed JSON-looking bodies as text", () => {
    const job = sqs({ MessageId: "m-1", Body: '{"orderId":' });

    expect(job.payload).toBe('{"orderId":');
  });

  it("unwraps an SNS notification envelope", () => {
    const body = JSON.stringify({ Type: "Notification", Message: '{"orderId":1007}' });
    const job = sqs({ MessageId: "m-1", Body: body });

    expect(job.payload).toEqual({ orderId: 1007 });
    expect(job.payloadText).toBe(body);
  });

  it("accepts a body the exporter already parsed", () => {
    const job = sqs({ MessageId: "m-1", Body: { orderId: 3 } });

    expect(job.payload).toEqual({ orderId: 3 });
    expect(job.payloadText).toBe('{"orderId":3}');
  });
});

describe("normalizeSqsRecord attributes", () => {
  it("maps ApproximateReceiveCount to attempts", () => {
    const job = sqs({ MessageId: "m-1", Body: "{}", Attributes: { ApproximateReceiveCount: "12" } });

    expect(job.attempts).toBe(12);
  });

  it("defaults attempts to zero when the attribute is missing", () => {
    expect(sqs({ MessageId: "m-1", Body: "{}" }).attempts).toBe(0);
  });

  it("converts SentTimestamp to an ISO string", () => {
    const job = sqs({ MessageId: "m-1", Body: "{}", Attributes: { SentTimestamp: "1789909331000" } });

    expect(job.failedAt).toBe(new Date(1789909331000).toISOString());
  });

  it("names the source queue from DeadLetterQueueSourceArn", () => {
    const job = sqs({
      MessageId: "m-1",
      Body: "{}",
      Attributes: { DeadLetterQueueSourceArn: "arn:aws:sqs:ca-central-1:123456789012:orders" },
    });

    expect(job.queue).toBe("orders");
  });

  it("falls back to the queue URL", () => {
    const job = sqs({
      MessageId: "m-1",
      Body: "{}",
      QueueUrl: "https://sqs.ca-central-1.amazonaws.com/123456789012/orders-dlq",
    });

    expect(job.queue).toBe("orders-dlq");
  });

  it("uses a positional id when MessageId is missing", () => {
    expect(sqs({ Body: "{}" }, 5).id).toBe("record-5");
  });
});

describe("normalizeSqsRecord error attributes", () => {
  it("reads Lambda failure attributes", () => {
    const job = sqs({
      MessageId: "m-1",
      Body: "{}",
      MessageAttributes: {
        ErrorCode: { StringValue: "200", DataType: "Number" },
        ErrorMessage: { StringValue: "Task timed out after 30.00 seconds", DataType: "String" },
      },
    });

    expect(job.errorClass).toBe("200");
    expect(job.errorMessage).toBe("Task timed out after 30.00 seconds");
  });

  it("prefers ErrorType over ErrorCode", () => {
    const job = sqs({
      MessageId: "m-1",
      Body: "{}",
      MessageAttributes: {
        ErrorType: { StringValue: "PaymentGatewayTimeout", DataType: "String" },
        ErrorCode: { StringValue: "200", DataType: "Number" },
      },
    });

    expect(job.errorClass).toBe("PaymentGatewayTimeout");
  });

  it("leaves errors empty without message attributes", () => {
    const job = sqs({ MessageId: "m-1", Body: "{}" });

    expect(job.errorClass).toBe("");
    expect(job.errorMessage).toBe("");
  });
});