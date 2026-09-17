import { describe, expect, it } from "vitest";

import { DumpLoadError, parseDump, parseJsonDump, parseJsonlDump } from "../src/load";

describe("parseJsonDump", () => {
  it("reads an array of records", () => {
    const { records, issues } = parseJsonDump('[{"id":"job-1"},{"id":"job-2"}]');

    expect(records.map((entry) => entry.record.id)).toEqual(["job-1", "job-2"]);
    expect(issues).toEqual([]);
  });

  it("reads records from a known collection key", () => {
    const { records } = parseJsonDump('{"Messages":[{"MessageId":"m-1","Body":"{}"}]}');

    expect(records).toHaveLength(1);
    expect(records[0].record.MessageId).toBe("m-1");
  });

  it("keeps non-object entries as issues instead of failing the file", () => {
    const { records, issues } = parseJsonDump('[{"id":"job-1"},42]');

    expect(records).toHaveLength(1);
    expect(issues).toEqual([{ index: 1, message: "Expected an object, found number." }]);
  });

  it("rejects an empty file", () => {
    expect(() => parseJsonDump("   ")).toThrow(DumpLoadError);
  });

  it("rejects a scalar root", () => {
    expect(() => parseJsonDump("12")).toThrow(/root must be an array or object/);
  });

  it("rejects an object with no record array", () => {
    expect(() => parseJsonDump('{"total":3}')).toThrow(/no record array/);
  });
});

describe("parseJsonlDump", () => {
  it("reads one record per line and skips blanks", () => {
    const { records, issues } = parseJsonlDump('{"id":"job-1"}\n\n{"id":"job-2"}\n');

    expect(records.map((entry) => entry.record.id)).toEqual(["job-1", "job-2"]);
    expect(records.map((entry) => entry.line)).toEqual([1, 3]);
    expect(issues).toEqual([]);
  });

  it("fails the line, not the file, on bad JSON", () => {
    const { records, issues } = parseJsonlDump('{"id":"job-1"}\nnope\n{"id":"job-3"}');

    expect(records).toHaveLength(2);
    expect(issues).toHaveLength(1);
    expect(issues[0].line).toBe(2);
  });

  it("rejects a file with no records at all", () => {
    expect(() => parseJsonlDump("\n\n")).toThrow(DumpLoadError);
  });
});

describe("parseDump", () => {
  it("picks the loader from the file extension", () => {
    expect(parseDump("dump.jsonl", '{"id":"job-1"}').records).toHaveLength(1);
    expect(parseDump("dump.json", '[{"id":"job-1"}]').records).toHaveLength(1);
  });

  it("sniffs the encoding when the name is unhelpful", () => {
    expect(parseDump("dump.txt", '{"id":"job-1"}\n{"id":"job-2"}').records).toHaveLength(2);
    expect(parseDump("dump.txt", '[{"id":"job-1"}]').records).toHaveLength(1);
  });
});
