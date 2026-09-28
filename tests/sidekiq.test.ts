import { describe, expect, it } from "vitest";

import { normalizeSidekiqRecord } from "../src/adapters/sidekiq";

function sidekiq(record: Record<string, unknown>, index = 0) {
  return normalizeSidekiqRecord({ index, record });
}

describe("normalizeSidekiqRecord", () => {
  it("maps a dead-set record", () => {
    const job = sidekiq({
      jid: "b4a577edbccf1d805744efa9",
      queue: "mailers",
      class: "WelcomeMailer",
      args: ["ops@example.com"],
      error_class: "Net::SMTPAuthenticationError",
      error_message: "535 5.7.8 Authentication credentials invalid",
      failed_at: 1790000000.5,
      retry_count: 24,
    });

    expect(job.id).toBe("b4a577edbccf1d805744efa9");
    expect(job.queue).toBe("mailers");
    expect(job.payload).toEqual({ class: "WelcomeMailer", args: ["ops@example.com"] });
    expect(job.errorClass).toBe("Net::SMTPAuthenticationError");
    expect(job.errorMessage).toBe("535 5.7.8 Authentication credentials invalid");
    expect(job.failedAt).toBe(new Date(1790000000500).toISOString());
  });

  it("counts retry_count plus the first failure as attempts", () => {
    expect(sidekiq({ jid: "j-1", class: "X", args: [], error_class: "Boom", retry_count: 0 }).attempts).toBe(1);
    expect(sidekiq({ jid: "j-1", class: "X", args: [], error_class: "Boom", retry_count: 24 }).attempts).toBe(25);
  });

  it("counts a job with retries disabled as one attempt", () => {
    const job = sidekiq({ jid: "j-1", class: "X", args: [], retry: false, error_class: "NoMethodError" });

    expect(job.attempts).toBe(1);
  });

  it("unwraps ActiveJob jobs to the real class and arguments", () => {
    const job = sidekiq({
      jid: "j-2",
      class: "ActiveJob::QueueAdapters::SidekiqAdapter::JobWrapper",
      wrapped: "OrderSyncJob",
      queue: "default",
      args: [{ job_class: "OrderSyncJob", job_id: "aj-1", arguments: [1001, { force: true }] }],
      error_class: "Faraday::TimeoutError",
    });

    expect(job.payload).toEqual({ class: "OrderSyncJob", args: [1001, { force: true }] });
  });

  it("reads millisecond timestamps written by Sidekiq 7", () => {
    const job = sidekiq({ jid: "j-1", class: "X", args: [], failed_at: 1790000000500 });

    expect(job.failedAt).toBe(new Date(1790000000500).toISOString());
  });

  it("falls back to a positional id and keeps the raw record", () => {
    const record = { class: "X", args: [] };
    const job = sidekiq(record, 6);

    expect(job.id).toBe("record-6");
    expect(job.raw).toBe(record);
  });
});
