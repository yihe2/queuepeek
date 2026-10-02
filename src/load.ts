import { isRecord } from "./detect";
import type { ParseIssue } from "./types";

export type LoadedRecord = {
  index: number;
  line?: number;
  record: Record<string, unknown>;
  /** The record arrived as a JSON string inside the dump, as Redis list exports store it. */
  encoded?: boolean;
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

const COLLECTION_KEYS = ["Messages", "jobs", "dead", "records", "items"];

function describeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

type Decoded = { record: Record<string, unknown>; encoded: boolean } | { problem: string };

function decodeEntry(entry: unknown): Decoded {
  if (isRecord(entry)) {
    return { record: entry, encoded: false };
  }

  if (typeof entry !== "string") {
    return { problem: `Expected an object, found ${describeValue(entry)}.` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(entry);
  } catch {
    parsed = undefined;
  }

  return isRecord(parsed)
    ? { record: parsed, encoded: true }
    : { problem: "String entry is not an encoded JSON object." };
}

function collectRecords(entries: unknown[]): RecordSet {
  const records: LoadedRecord[] = [];
  const issues: ParseIssue[] = [];

  entries.forEach((entry: unknown, index: number) => {
    const decoded = decodeEntry(entry);

    if ("problem" in decoded) {
      issues.push({ index, message: decoded.problem });
      return;
    }

    records.push({ index, record: decoded.record, encoded: decoded.encoded });
  });

  return { records, issues };
}

function findCollection(root: Record<string, unknown>): unknown[] {
  for (const key of COLLECTION_KEYS) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  throw new DumpLoadError(
    `Dump object has no record array. Expected one of: ${COLLECTION_KEYS.join(", ")}.`,
  );
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

  if (Array.isArray(root)) {
    return collectRecords(root);
  }

  if (isRecord(root)) {
    return collectRecords(findCollection(root));
  }

  throw new DumpLoadError(`Dump root must be an array or object, found ${describeValue(root)}.`);
}

export function parseJsonlDump(text: string): RecordSet {
  const records: LoadedRecord[] = [];
  const issues: ParseIssue[] = [];
  let index = 0;

  text.split(/\r?\n/).forEach((raw, offset) => {
    const line = offset + 1;
    const trimmed = raw.trim();

    if (trimmed === "") {
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      issues.push({ index, line, message: `Line is not valid JSON: ${(error as Error).message}` });
      index += 1;
      return;
    }

    const decoded = decodeEntry(parsed);

    if ("problem" in decoded) {
      issues.push({ index, line, message: decoded.problem });
      index += 1;
      return;
    }

    records.push({ index, line, record: decoded.record, encoded: decoded.encoded });
    index += 1;
  });

  if (records.length === 0 && issues.length === 0) {
    throw new DumpLoadError("Dump file has no records.");
  }

  return { records, issues };
}

function looksLikeJsonl(text: string): boolean {
  const trimmed = text.trimStart();
  return trimmed !== "" && !trimmed.startsWith("[") && !trimmed.startsWith("{\n");
}

export function parseDump(sourceName: string, text: string): RecordSet {
  const name = sourceName.toLowerCase();

  if (name.endsWith(".jsonl")) {
    return parseJsonlDump(text);
  }

  if (name.endsWith(".json")) {
    return parseJsonDump(text);
  }

  return looksLikeJsonl(text) ? parseJsonlDump(text) : parseJsonDump(text);
}
