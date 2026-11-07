import type { ErrorGroup } from "./grouping";
import { normalizeMessage } from "./grouping/messages";
import { pickSample } from "./grouping/sample";
import { summarizeJobs } from "./grouping/summary";
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

/** `poison` marks a job the rules missed; `clear` overrules the rules for a job that is fine. */
export type PoisonMark = "poison" | "clear";

/** Keyed by job id. Jobs left to the rules are absent. */
export type PoisonOverrides = ReadonlyMap<string, PoisonMark>;

export const noOverrides: PoisonOverrides = new Map();

/** `null` hands the job back to the rules. */
export function markPoison(overrides: PoisonOverrides, jobId: string, mark: PoisonMark | null): PoisonOverrides {
  const next = new Map(overrides);
  if (mark === null) {
    next.delete(jobId);
  } else {
    next.set(jobId, mark);
  }
  return next;
}

export function isPoison(report: PoisonReport, overrides: PoisonOverrides, jobId: string): boolean {
  const mark = overrides.get(jobId);
  if (mark !== undefined) {
    return mark === "poison";
  }
  return poisonReasons(report, jobId).length > 0;
}

/** Flips the job's effective state, dropping the override when it would only repeat what the rules say. */
export function togglePoison(report: PoisonReport, overrides: PoisonOverrides, jobId: string): PoisonOverrides {
  const byRules = poisonReasons(report, jobId).length > 0;
  const wanted = !isPoison(report, overrides, jobId);
  if (wanted === byRules) {
    return markPoison(overrides, jobId, null);
  }
  return markPoison(overrides, jobId, wanted ? "poison" : "clear");
}

export function poisonJobs(jobs: Job[], report: PoisonReport, overrides: PoisonOverrides): Job[] {
  return jobs.filter((job) => isPoison(report, overrides, job.id));
}

/** Error group ids are `g-` plus a hash, so this cannot collide with one. */
export const POISON_GROUP_ID = "poison";

/**
 * All poison jobs as one list, shaped like an error group so the sidebar, table, and selection
 * work on it unchanged. The jobs also stay in their error groups.
 */
export function poisonGroup(jobs: Job[]): ErrorGroup | null {
  if (jobs.length === 0) {
    return null;
  }
  return {
    id: POISON_GROUP_ID,
    errorClass: "Poison",
    message: "",
    jobs,
    sample: pickSample(jobs),
    ...summarizeJobs(jobs),
  };
}

export function describeReason(reason: PoisonReason): string {
  switch (reason.rule) {
    case "attempts":
      return `${reason.attempts} attempts (limit ${reason.limit})`;
    case "repeat":
      return `same payload failed the same way ${reason.count} times`;
  }
}
