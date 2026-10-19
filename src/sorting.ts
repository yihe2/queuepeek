import type { Job } from "./types";

/** `dump` keeps the order the jobs had in the file. */
export type SortKey = "dump" | "queue" | "attempts" | "failedAt";
export type SortDirection = "asc" | "desc";

export type JobSort = {
  key: SortKey;
  direction: SortDirection;
};

export const dumpOrder: JobSort = { key: "dump", direction: "asc" };

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function failedTime(job: Job): number | null {
  const time = Date.parse(job.failedAt);
  return Number.isNaN(time) ? null : time;
}

/**
 * Returns a sorted copy. Ties keep dump order. Jobs without a readable failure time
 * always sort last, whichever way the column is sorted.
 */
export function sortJobs(jobs: Job[], sort: JobSort): Job[] {
  if (sort.key === "dump") {
    return sort.direction === "asc" ? jobs : [...jobs].reverse();
  }

  const sign = sort.direction === "asc" ? 1 : -1;

  return [...jobs].sort((a, b) => {
    switch (sort.key) {
      case "queue":
        return sign * compareText(a.queue, b.queue);
      case "attempts":
        return sign * (a.attempts - b.attempts);
      case "failedAt": {
        const left = failedTime(a);
        const right = failedTime(b);
        if (left === null || right === null) {
          return left === right ? 0 : left === null ? 1 : -1;
        }
        return sign * (left - right);
      }
      default:
        return 0;
    }
  });
}

/** Header click: a new column starts ascending, the same column flips, and a third click goes back to dump order. */
export function nextSort(current: JobSort, key: SortKey): JobSort {
  if (current.key !== key) {
    return { key, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }
  return dumpOrder;
}
