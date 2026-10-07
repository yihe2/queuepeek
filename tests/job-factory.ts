import type { Job } from "../src/types";

let counter = 0;

export function makeJob(overrides: Partial<Job> = {}): Job {
  counter += 1;

  return {
    id: `job-${counter}`,
    queue: "orders",
    producer: "generic",
    payload: {},
    payloadText: "{}",
    errorClass: "",
    errorMessage: "",
    attempts: 1,
    failedAt: "",
    raw: {},
    ...overrides,
  };
}
