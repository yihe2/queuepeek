import type { Producer } from "./types";

export type DetectedProducer = Producer | "unknown";

export type FormatDetection = {
  producer: DetectedProducer;
  mismatches: number;
  sampled: number;
};

export type DetectOptions = {
  /** Every record arrived as a JSON string, the shape of a Redis list export. */
  encoded?: boolean;
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

  if (typeof record.error_class === "string" || (typeof record.class === "string" && Array.isArray(record.args))) {
    return "sidekiq";
  }

  if (
    "payload" in record ||
    typeof record.error === "string" ||
    isRecord(record.error) ||
    typeof record.attempts === "number"
  ) {
    return "generic";
  }

  return "unknown";
}

export function detectDumpFormat(records: unknown[], options: DetectOptions = {}): FormatDetection {
  const fingerprints = records.map(fingerprintRecord);
  const first = fingerprints.find((producer) => producer !== "unknown") ?? "unknown";
  const mismatches = fingerprints.filter((item) => item !== "unknown" && item !== first).length;

  // Sidekiq jobs stored in Redis keep the Sidekiq adapter; only generic or unrecognized strings become "redis".
  const producer =
    options.encoded && records.length > 0 && (first === "generic" || first === "unknown") ? "redis" : first;

  return { producer, mismatches, sampled: records.length };
}

export class MixedDumpError extends Error {
  constructor(detection: FormatDetection) {
    super(
      `Dump mixes producers: ${detection.mismatches} of ${detection.sampled} records do not look like ` +
        `${detection.producer}. Split the file by source and load each part.`,
    );
    this.name = "MixedDumpError";
  }
}

export function assertSingleProducer(detection: FormatDetection): void {
  if (detection.mismatches > 0) {
    throw new MixedDumpError(detection);
  }
}