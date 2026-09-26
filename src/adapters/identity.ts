import type { Job } from "../types";

export type SqsIdentity = {
  messageId: string;
  receiptHandle: string;
};

/**
 * Receipt handles expire once the visibility timeout lapses, so an old dump's
 * handle may be unusable. Exports still carry it; callers decide whether to trust it.
 */
export function sqsIdentity(job: Job): SqsIdentity | null {
  if (job.producer !== "sqs") {
    return null;
  }

  const { MessageId, ReceiptHandle } = job.raw;
  if (typeof MessageId !== "string" || MessageId === "") {
    return null;
  }

  return {
    messageId: MessageId,
    receiptHandle: typeof ReceiptHandle === "string" ? ReceiptHandle : "",
  };
}
