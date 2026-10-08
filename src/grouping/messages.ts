export function normalizeMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}
