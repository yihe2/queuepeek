import type { DetectedProducer } from "../detect";
import type { LoadedRecord } from "../load";
import { normalizeRecords } from "./generic";
import type { Job } from "../types";
import { normalizeSidekiqRecord } from "./sidekiq";
import { normalizeSqsRecord } from "./sqs";

export function toJobs(records: LoadedRecord[], producer: DetectedProducer): Job[] {
  switch (producer) {
    case "sqs":
      return records.map((entry) => normalizeSqsRecord(entry));
    case "sidekiq":
      return records.map((entry) => normalizeSidekiqRecord(entry));
    case "unknown":
      return normalizeRecords(records, "generic");
    default:
      return normalizeRecords(records, producer);
  }
}
