import { normalizeMessage } from "./grouping/messages";
import type { Job } from "./types";

/**
 * A poison message is one that will fail again however often it is retried, so it should be
 * set aside instead of going back to the queue. The rules here are heuristics; operators can
 * override them per job.
 */
export type PoisonRules = {
  /** A job with at least this many attempts is poison. 0 turns the rule off. */
  maxAttempts: number;
  /** The same payload failing with the same error at least this many times is poison. 0 turns the rule off. */
  repeatCount: number;
};

export const defaultRules: PoisonRules = {
  maxAttempts: 10,
  repeatCount: 3,
};

export type PoisonReason =
  | { rule: "attempts"; attempts: number; limit: number }
  | { rule: "repeat"; count: number };

/** Reasons per job id. Jobs no rule fired for are absent. */
export type PoisonReport = ReadonlyMap<string, PoisonReason[]>;

/** Same error group key as grouping, plus the payload, so "the same message failing the same way". */
function repeatKey(job: Job): string {
  return `${job.errorClass.trim()}\u0000${normalizeMessage(job.errorMessage)}\u0000${job.payloadText.trim()}`;
}

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

  // A single copy can never repeat, so a limit below 2 would flag every job.
  if (rules.repeatCount >= 2) {
    const copies = new Map<string, Job[]>();
    for (const job of jobs) {
      const key = repeatKey(job);
      copies.set(key, [...(copies.get(key) ?? []), job]);
    }
    for (const same of copies.values()) {
      if (same.length >= rules.repeatCount) {
        same.forEach((job) => add(job, { rule: "repeat", count: same.length }));
      }
    }
  }

  return report;
}

export function poisonReasons(report: PoisonReport, jobId: string): PoisonReason[] {
  return report.get(jobId) ?? [];
}

export function describeReason(reason: PoisonReason): string {
  switch (reason.rule) {
    case "attempts":
      return `${reason.attempts} attempts (limit ${reason.limit})`;
    case "repeat":
      return `same payload failed the same way ${reason.count} times`;
  }
}
