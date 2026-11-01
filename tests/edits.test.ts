import { describe, expect, it } from "vitest";

import {
  checkPayload,
  editPayload,
  getEdit,
  inclusion,
  isEdited,
  isIncluded,
  noEdits,
  payloadText,
  retrySummary,
  revertPayload,
  setIncluded,
} from "../src/edits";
import { prettyPayload } from "../src/ui/payload";
import { makeJob } from "./job-factory";

const original = '{\n  "orderId": 1001\n}';

describe("checkPayload", () => {
  const structured = makeJob({ payload: { orderId: 1001 } });
  const plain = makeJob({ payload: "charge 1001", payloadText: "charge 1001" });

  it("accepts valid JSON for structured payloads", () => {
    expect(checkPayload(structured, '{"orderId": 1002}')).toEqual({ ok: true });
  });

  it("rejects broken or empty JSON for structured payloads", () => {
    expect(checkPayload(structured, '{"orderId": ').ok).toBe(false);
    expect(checkPayload(structured, "   ").ok).toBe(false);
  });

  it("accepts any text for plain-text payloads", () => {
    expect(checkPayload(plain, "retry 1001 please {")).toEqual({ ok: true });
  });
});

describe("editPayload", () => {
  it("records edited text", () => {
    const edits = editPayload(noEdits, "j-1", '{"orderId": 1002}', original);

    expect(isEdited(edits, "j-1")).toBe(true);
    expect(payloadText(edits, "j-1", original)).toBe('{"orderId": 1002}');
  });

  it("treats text equal to the original as no edit", () => {
    const edits = editPayload(noEdits, "j-1", original, original);

    expect(edits.size).toBe(0);
  });

  it("does not modify the previous edits", () => {
    editPayload(noEdits, "j-1", "{}", original);

    expect(noEdits.size).toBe(0);
  });
});

describe("revertPayload", () => {
  it("drops the edited text", () => {
    const edits = revertPayload(editPayload(noEdits, "j-1", "{}", original), "j-1");

    expect(isEdited(edits, "j-1")).toBe(false);
    expect(payloadText(edits, "j-1", original)).toBe(original);
  });
});

describe("setIncluded", () => {
  it("flags several jobs at once", () => {
    const edits = setIncluded(noEdits, ["j-1", "j-2"], true);

    expect(isIncluded(edits, "j-1")).toBe(true);
    expect(isIncluded(edits, "j-2")).toBe(true);
    expect(isIncluded(edits, "j-3")).toBe(false);
  });

  it("forgets jobs that are neither edited nor included", () => {
    const edits = setIncluded(setIncluded(noEdits, ["j-1"], true), ["j-1"], false);

    expect(edits.size).toBe(0);
    expect(getEdit(edits, "j-1")).toEqual({ text: null, included: false });
  });
});

describe("edit and revert round trips", () => {
  const job = makeJob({ id: "rt-1", payload: { orderId: 1001 }, payloadText: '{"orderId":1001}' });
  const pretty = prettyPayload(job);

  it("returns to the exact original text after several edits and a revert", () => {
    let edits = editPayload(noEdits, job.id, '{"orderId": 1002}', pretty);
    edits = editPayload(edits, job.id, '{"orderId": 1003, "note": "manual"}', pretty);
    edits = revertPayload(edits, job.id);

    expect(payloadText(edits, job.id, pretty)).toBe(pretty);
    expect(edits.size).toBe(0);
  });

  it("clears the edit when the text is typed back to the original", () => {
    let edits = editPayload(noEdits, job.id, '{"orderId": 1002}', pretty);
    edits = editPayload(edits, job.id, pretty, pretty);

    expect(isEdited(edits, job.id)).toBe(false);
  });

  it("keeps the retry flag through an edit and a revert", () => {
    let edits = setIncluded(noEdits, [job.id], true);
    edits = editPayload(edits, job.id, "{}", pretty);
    edits = revertPayload(edits, job.id);

    expect(isIncluded(edits, job.id)).toBe(true);
  });

  it("keeps the edited text when the job is taken out of the batch", () => {
    let edits = editPayload(noEdits, job.id, "{}", pretty);
    edits = setIncluded(setIncluded(edits, [job.id], true), [job.id], false);

    expect(payloadText(edits, job.id, pretty)).toBe("{}");
  });

  it("never touches the parsed job", () => {
    revertPayload(editPayload(noEdits, job.id, '{"orderId": 9}', pretty), job.id);

    expect(job.payload).toEqual({ orderId: 1001 });
    expect(job.payloadText).toBe('{"orderId":1001}');
  });

  it("can revert an invalid edit back to a valid payload", () => {
    const broken = editPayload(noEdits, job.id, '{"orderId": ', pretty);
    const reverted = revertPayload(broken, job.id);

    expect(checkPayload(job, payloadText(broken, job.id, pretty)).ok).toBe(false);
    expect(checkPayload(job, payloadText(reverted, job.id, pretty)).ok).toBe(true);
  });
});

describe("inclusion", () => {
  const jobs = [makeJob({ id: "g-1" }), makeJob({ id: "g-2" })];

  it("reports none, some, or all of a group", () => {
    expect(inclusion(jobs, noEdits)).toBe("none");
    expect(inclusion(jobs, setIncluded(noEdits, ["g-1"], true))).toBe("some");
    expect(inclusion(jobs, setIncluded(noEdits, ["g-1", "g-2"], true))).toBe("all");
  });
});

describe("retrySummary", () => {
  it("counts included, edited, and invalid jobs", () => {
    const jobs = [
      makeJob({ id: "r-1", payload: { a: 1 } }),
      makeJob({ id: "r-2", payload: { a: 2 } }),
      makeJob({ id: "r-3", payload: { a: 3 } }),
    ];
    let edits = setIncluded(noEdits, ["r-1", "r-2"], true);
    edits = editPayload(edits, "r-2", '{"a": 20}', "{}");
    edits = editPayload(edits, "r-3", '{"a": ', "{}");

    expect(retrySummary(jobs, edits)).toEqual({ included: 2, edited: 2, invalid: 1 });
  });
});
