import type { DetectedProducer } from "../detect";
import type { LoadedRecord } from "../load";
import { normalizeRecords } from "../normalize";
import type { Job } from "../types";
import { normalizeSqsRecord } from "./sqs";

export function toJobs(records: LoadedRecord[], producer: DetectedProducer): Job[] {
  switch (producer) {
    case "sqs":
      return records.map((entry) => normalizeSqsRecord(entry));
    case "unknown":
      return normalizeRecords(records, "generic");
    default:
      return normalizeRecords(records, producer);
  }
}
