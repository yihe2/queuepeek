const MASKS: Array<[RegExp, string]> = [
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>"],
  [/\b0x[0-9a-f]+\b/gi, "<hex>"],
  [/\b[0-9a-f]{16,}\b/gi, "<id>"],
  [/"[^"]*"/g, "<str>"],
  [/(?<![A-Za-z_])\d+(?:\.\d+)?/g, "<n>"],
];

/**
 * Masks the parts of an error message that change per job (ids, counts, durations, quoted values)
 * so that "user 41 not found" and "user 977 not found" land in the same group.
 * Order matters: UUIDs and hex ids must be masked before bare numbers eat their digits.
 */
export function normalizeMessage(message: string): string {
  let normalized = message;

  for (const [pattern, replacement] of MASKS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
}
