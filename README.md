# Queuepeek

Queuepeek is a local workbench for dead-letter and failed-job dumps. Load a JSON or JSONL export, normalize it, group failures, edit retry payloads, and mark poison messages — without connecting to a live broker.

## What It Does

Queue workers fail in bulk: the same `NullPointerException`, the same malformed order id, a payload that can never succeed. The usual tools either retry everything or make you grep a 200 MB export.

Queuepeek is for the offline dump you already have:

- SQS dead-letter `ReceiveMessage` / export JSON
- Sidekiq dead-set style records
- Redis list / hash dumps of job JSON
- generic JSONL with `payload`, `error`, and `attempts`

It does **not** talk to AWS, Redis, or Sidekiq in v1. You bring a file; you leave with a triage session and a retry batch.

## Features

- detect dump format and map records onto a canonical job model
- group by error class / message
- inspect and edit payloads before export
- flag poison messages (high receive count, identical payload that always fails)
- filter by queue, class, attempt count, and time
- export a retry JSON batch and a leftover DLQ slice
- keep sessions on the machine (no account, no backend)

## Out Of Scope For v1

- live `ReceiveMessage` / `DeleteMessage` against AWS
- pushing retries back onto a real queue
- multi-user review
- a hosted SaaS

## Stack

- TypeScript
- Vite
- Vitest for parsers, grouping, and poison rules
- IndexedDB (or localStorage until payloads get large)

## Repository Shape

```text
queuepeek/
  src/
  public/
  samples/
  docs/
  index.html
  package.json
```

## Status

Early scaffold. Parsers and the workbench UI are not in the tree yet. Design notes live under [docs/](docs/).
