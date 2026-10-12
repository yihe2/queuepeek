import { describe, expect, it } from "vitest";

import { escapeHtml } from "../src/ui/escape";

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;",
    );
  });

  it("escapes ampersands first so entities are not double-decoded", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("keeps masked message tokens visible as text", () => {
    expect(escapeHtml("Task timed out after <n> seconds")).toBe("Task timed out after &lt;n&gt; seconds");
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("payment gateway timeout")).toBe("payment gateway timeout");
  });
});
