import { describe, expect, it } from "vitest";

import { editPayload, noEdits } from "../src/edits";
import { buildExport, ExportError } from "../src/export/files";
import { makeJob } from "./job-factory";

const at = new Date("2026-11-10T15:00:00Z");

const jobs = [
  makeJob({ id: "r-1", queue: "orders", payload: { order: 1 }, payloadText: '{"order":1}', attempts: 3 }),
  makeJob({ id: "r-2", queue: "orders", payload: "charge 2", payloadText: "charge 2" }),
];

describe("retry export", () => {
  it("wraps the jobs with source and time", () => {
    const file = buildExport("retry", "orders-dlq.json", jobs, noEdits, at);

    expect(file).toMatchObject({
      format: "queuepeek-export",
      version: 1,
      kind: "retry",
      source: "orders-dlq.json",
      exportedAt: "2026-11-10T15:00:00.000Z",
      count: 2,
    });
    expect(file.records[0]).toMatchObject({ id: "r-1", queue: "orders", payload: { order: 1 }, edited: false, attempts: 3 });
  });

  it("writes edited JSON payloads as parsed JSON", () => {
    const edits = editPayload(noEdits, "r-1", '{"order": 1, "retry": true}', "{}");

    expect(buildExport("retry", "d.json", jobs, edits, at).records[0]).toMatchObject({
      payload: { order: 1, retry: true },
      edited: true,
    });
  });

  it("keeps edited plain-text payloads as text", () => {
    const edits = editPayload(noEdits, "r-2", "charge 2 again", "charge 2");

    expect(buildExport("retry", "d.json", jobs, edits, at).records[1].payload).toBe("charge 2 again");
  });

  it("refuses a batch with a broken edited payload", () => {
    const edits = editPayload(noEdits, "r-1", '{"order": ', "{}");

    expect(() => buildExport("retry", "d.json", jobs, edits, at)).toThrow(ExportError);
    try {
      buildExport("retry", "d.json", jobs, edits, at);
    } catch (error) {
      expect((error as ExportError).jobIds).toEqual(["r-1"]);
    }
  });
});

describe("poison and leftover exports", () => {
  const edits = editPayload(noEdits, "r-1", '{"order": 99}', "{}");

  it("always carry the payload as dumped", () => {
    for (const kind of ["poison", "leftover"] as const) {
      const file = buildExport(kind, "d.json", jobs, edits, at);

      expect(file.kind).toBe(kind);
      expect(file.records[0]).toMatchObject({ payload: { order: 1 }, edited: false });
    }
  });

  it("do not refuse broken edits, since the edit is not exported", () => {
    const broken = editPayload(noEdits, "r-1", '{"order": ', "{}");

    expect(buildExport("leftover", "d.json", jobs, broken, at).count).toBe(2);
  });

  it("can be empty", () => {
    expect(buildExport("poison", "d.json", [], noEdits, at)).toMatchObject({ count: 0, records: [] });
  });
});
