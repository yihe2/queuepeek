import { isIncluded, type Edits } from "../edits";
import type { Job } from "../types";

/**
 * Every job of a dump lands in exactly one part, so the three export files together
 * account for the whole DLQ and nothing is retried twice or silently dropped.
 */
export type Partition = {
  /** Ticked for retry, including poison jobs an operator chose to retry anyway. */
  retry: Job[];
  /** Poison and not ticked. */
  poison: Job[];
  /** Everything else: stays in the DLQ for now. */
  leftover: Job[];
};

export function partitionJobs(jobs: Job[], edits: Edits, poisoned: (jobId: string) => boolean): Partition {
  const partition: Partition = { retry: [], poison: [], leftover: [] };

  for (const job of jobs) {
    if (isIncluded(edits, job.id)) {
      partition.retry.push(job);
    } else if (poisoned(job.id)) {
      partition.poison.push(job);
    } else {
      partition.leftover.push(job);
    }
  }
  return partition;
}
