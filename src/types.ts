export type Producer = "sqs" | "sidekiq" | "redis" | "generic";

export type Job = {
  id: string;
  queue: string;
  producer: Producer;
  payload: unknown;
  payloadText: string;
  errorClass: string;
  errorMessage: string;
  attempts: number;
  failedAt: string;
  raw: Record<string, unknown>;
};

export type ParseIssue = {
  index: number;
  line?: number;
  message: string;
};

export type DumpBatch = {
  sourceName: string;
  producer: Producer;
  jobs: Job[];
  issues: ParseIssue[];
};
