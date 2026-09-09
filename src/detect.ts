import type { Producer } from "./types";

export type DetectedProducer = Producer | "unknown";

export type FormatDetection = {
  producer: DetectedProducer;
  mismatches: number;
  sampled: number;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function fingerprintRecord(record: unknown): DetectedProducer {
  if (!isRecord(record)) {
    return "unknown";
  }

  if (typeof record.MessageId === "string" && "Body" in record) {
    return "sqs";
  }

  if (
    typeof record.error_class === "string" ||
    (typeof record.jid === "string" && typeof record.class === "string" && "args" in record)
  ) {
    return "sidekiq";
  }

  if ("payload" in record || typeof record.error === "string" || isRecord(record.error)) {
    return "generic";
  }

  return "unknown";
}

export function detectDumpFormat(records: unknown[]): FormatDetection {
  if (records.length === 0) {
    return { producer: "unknown", mismatches: 0, sampled: 0 };
  }

  const fingerprints = records.map(fingerprintRecord);
  const known = fingerprints.filter((producer) => producer !== "unknown");

  if (known.length === 0) {
    return { producer: "unknown", mismatches: 0, sampled: records.length };
  }

  const producer = known[0];
  const mismatches = fingerprints.filter((item) => item !== "unknown" && item !== producer).length;

  return { producer, mismatches, sampled: records.length };
}
