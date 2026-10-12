import { describe, expect, it } from "vitest";

import { payloadPreview, plural, queueSummary, shortTime, truncate } from "../src/ui/format";
import { makeJob } from "./job-factory";

describe("plural", () => {
  it("adds an s for anything but one", () => {
    expect(plural(0, "job")).toBe("0 jobs");
    expect(plural(1, "job")).toBe("1 job");
    expect(plural(12, "group")).toBe("12 groups");
  });
});

describe("truncate", () => {
  it("keeps short text and cuts long text with an ellipsis", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("payment gateway timeout", 10)).toBe("payment g…");
    expect(truncate("payment gateway timeout", 10)).toHaveLength(10);
  });
});

describe("shortTime", () => {
  it("formats ISO timestamps to the minute in UTC", () => {
    expect(shortTime("2026-10-01T15:12:40.000Z")).toBe("2026-10-01 15:12");
  });

  it("shows a dash for missing times and passes unreadable ones through", () => {
    expect(shortTime("")).toBe("—");
    expect(shortTime("yesterday-ish")).toBe("yesterday-ish");
  });
});

describe("payloadPreview", () => {
  it("flattens whitespace and truncates", () => {
    const job = makeJob({ payloadText: '{\n  "orderId": 1001,\n  "amount": 4290\n}' });

    expect(payloadPreview(job)).toBe('{ "orderId": 1001, "amount": 4290 }');
    expect(payloadPreview(job, 12)).toBe('{ "orderId"…');
  });
});

describe("queueSummary", () => {
  it("lists queues with counts and names the empty queue", () => {
    expect(
      queueSummary([
        { queue: "orders", count: 2 },
        { queue: "", count: 1 },
      ]),
    ).toBe("orders ×2, (no queue)");
  });

  it("folds extra queues into a count", () => {
    expect(
      queueSummary([
        { queue: "orders", count: 3 },
        { queue: "refunds", count: 2 },
        { queue: "mailers", count: 1 },
        { queue: "imports", count: 1 },
      ]),
    ).toBe("orders ×3, refunds ×2 +2 more");
  });
});
