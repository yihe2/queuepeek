import type { ExportKind } from "../export/files";

/** `orders-dlq.json` exported as retry at 15:04 UTC becomes `orders-dlq.retry.20261110-1504.json`. */
export function exportFileName(source: string, kind: ExportKind, at: Date): string {
  const base =
    source
      .replace(/\.jsonl?$/i, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dump";
  const [date, time] = at.toISOString().slice(0, 16).split("T");
  return `${base}.${kind}.${date.replace(/-/g, "")}-${time.replace(":", "")}.json`;
}

/** Saves through a temporary object URL; nothing is uploaded. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
