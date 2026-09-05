# Dump Formats And Job Model

Queuepeek is an offline inspector. A **dump** is a file the operator already exported. Adapters normalize vendor JSON onto one job record so grouping, poison rules, and retry export share the same code.

## Canonical Job

```text
Job
  id            string     stable within the dump
  queue         string     queue / topic / URL name if known
  producer      string     sqs | sidekiq | redis | generic
  payload       unknown    parsed object or string
  payloadText   string     original body text
  errorClass    string     empty if the dump has no class
  errorMessage  string     empty if the dump has no message
  attempts      number     receive / retry count, default 0
  failedAt      string     ISO timestamp if present
  raw           object     untouched vendor record
```

`raw` is mandatory. Exports that need `MessageId`, `ReceiptHandle`, or Sidekiq `jid` read it from `raw`, not from invented fields.

## File Encodings

- **JSON array** of records
- **JSON object** with a well-known collection key (`Messages`, `jobs`, `dead`)
- **JSONL** one record per line; skip blank lines; fail the line, not the file, on a bad line

## SQS

Expected keys on a record: `MessageId`, `Body`, optional `Attributes` / `MessageAttributes`.

- `id` ← `MessageId`
- `payloadText` ← `Body`
- if `Body` is JSON, parse into `payload`; otherwise keep the string
- `attempts` ← `ApproximateReceiveCount` when present
- `queue` ← attribute `QueueUrl` or a file-level hint, else empty

Out of v1: `ReceiveMessage` against a live queue.

## Sidekiq

Dead-set style records often include `queue`, `class`, `args`, `error_class`, `error_message`, `failed_at`, `retry_count`, `jid`.

- `id` ← `jid` or a hash of the raw record
- `payload` ← `{ class, args }`
- `errorClass` / `errorMessage` ← Sidekiq error fields
- `attempts` ← `retry_count`

## Redis

Treat a dump as an array of JSON strings or objects taken from a list/hash. If a string parses as Sidekiq or generic JSON, reuse that adapter. Do not require redis-cli encoding (`*3\r\n...`) in v1.

## Generic JSONL

Minimal useful record:

```json
{"id":"job-1","queue":"orders","payload":{"orderId":9},"error":"Timeout","attempts":8}
```

`error` may be a string or `{ "class": "...", "message": "..." }`.

## Format Detection

Prefer strict files: one producer per dump. Fingerprint the first record; if later records disagree, fail with a count of mismatches rather than silently mixing adapters.

## Poison (v1 rules)

A job is **poison** when either:

1. `attempts` is at or above a configurable threshold (default 10), or
2. the same `payloadText` appears at least N times (default 3) with the same `errorClass`

Operators can override by hand. Poison jobs are excluded from the default retry export.
