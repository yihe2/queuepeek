import type { Job } from "./types";

/**
 * A poison message is one that will fail again however often it is retried, so it should be
 * set aside instead of going back to the queue. The rules here are heuristics; operators can
 * override them per job.
 */
export type PoisonRules = {
  /** A job with at least this many attempts is poison. 0 turns the rule off. */
  maxAttempts: number;
};

export const defaultRules: PoisonRules = {
  maxAttempts: 10,
};

export type PoisonReason = { rule: "attempts"; attempts: number; limit: number };

/** Reasons per job id. Jobs no rule fired for are absent. */
export type PoisonReport = ReadonlyMap<string, PoisonReason[]>;

export function findPoison(jobs: Job[], rules: PoisonRules = defaultRules): PoisonReport {
  const report = new Map<string, PoisonReason[]>();
  const add = (job: Job, reason: PoisonReason) => {
    report.set(job.id, [...(report.get(job.id) ?? []), reason]);
  };

  if (rules.maxAttempts > 0) {
    for (const job of jobs) {
      if (job.attempts >= rules.maxAttempts) {
        add(job, { rule: "attempts", attempts: job.attempts, limit: rules.maxAttempts });
      }
    }
  }

  return report;
}

export function poisonReasons(report: PoisonReport, jobId: string): PoisonReason[] {
  return report.get(jobId) ?? [];
}

export function describeReason(reason: PoisonReason): string {
  return `${reason.attempts} attempts (limit ${reason.limit})`;
}
