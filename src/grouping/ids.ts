export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/**
 * Derived from the group's class and normalized message only, so the same failure keeps
 * its id across reloads and across dumps taken on different days.
 */
export function groupId(errorClass: string, message: string): string {
  return `g-${fnv1a32(`${errorClass}\u0000${message}`).toString(16).padStart(8, "0")}`;
}
