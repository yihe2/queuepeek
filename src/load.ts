import { isRecord } from "./detect";
import type { ParseIssue } from "./types";

export type LoadedRecord = {
  index: number;
  record: Record<string, unknown>;
};

export type RecordSet = {
  records: LoadedRecord[];
  issues: ParseIssue[];
};

/** Thrown when nothing in the file can be read as a dump. Per-record problems become issues instead. */
export class DumpLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DumpLoadError";
  }
}

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

function collectRecords(entries: unknown[]): RecordSet {
  const records: LoadedRecord[] = [];
  const issues: ParseIssue[] = [];

  entries.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push({ index, message: `Expected an object, found ${describeValue(entry)}.` });
      return;
    }

    records.push({ index, record: entry });
  });

  return { records, issues };
}

export function parseJsonDump(text: string): RecordSet {
  const trimmed = text.trim();

  if (trimmed === "") {
    throw new DumpLoadError("Dump file is empty.");
  }

  let root: unknown;
  try {
    root = JSON.parse(trimmed);
  } catch (error) {
    throw new DumpLoadError(`Dump is not valid JSON: ${(error as Error).message}`);
  }

  if (!Array.isArray(root)) {
    throw new DumpLoadError(`Dump root must be an array, found ${describeValue(root)}.`);
  }

  return collectRecords(root);
}
