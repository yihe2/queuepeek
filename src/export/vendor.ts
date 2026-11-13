import { sqsIdentity } from "../adapters/identity";
import type { Job } from "../types";

/**
 * Fields a redrive or delete script needs to find the original message, copied from the raw
 * record. Empty when the producer has nothing beyond `id`.
 */
export type VendorIds = Record<string, string>;

function rawText(job: Job, key: string): string {
  const value = job.raw[key];
  return typeof value === "string" ? value : "";
}

function present(fields: VendorIds): VendorIds {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== ""));
}

export function vendorIds(job: Job): VendorIds {
  switch (job.producer) {
    case "sqs": {
      const identity = sqsIdentity(job);
      return present({
        messageId: identity?.messageId ?? "",
        receiptHandle: identity?.receiptHandle ?? "",
        md5OfBody: rawText(job, "MD5OfBody"),
      });
    }
    case "sidekiq":
      // `class` is the class Sidekiq enqueued, which for ActiveJob is the wrapper, not the job shown in the payload.
      return present({ jid: rawText(job, "jid"), class: rawText(job, "class"), queue: rawText(job, "queue") });
    default:
      return {};
  }
}
