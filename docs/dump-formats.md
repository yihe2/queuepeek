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
- if `Body` is JSON, parse into `payload` (unwrapping SNS envelopes); otherwise keep the string
- `attempts` ← `ApproximateReceiveCount` when present
- `queue` ← source queue from `DeadLetterQueueSourceArn`, else `QueueUrl`, else empty
- `errorClass` / `errorMessage` ← Lambda-style `ErrorCode` / `ErrorMessage` message attributes

Full mapping and known gaps: [adapters.md](adapters.md). Out of v1: `ReceiveMessage` against a live queue.

## Sidekiq

Dead-set style records often include `queue`, `class`, `args`, `error_class`, `error_message`, `failed_at`, `retry_count`, `jid`.

- `id` ← `jid`, else the record's position
- `payload` ← `{ class, args }`, unwrapping ActiveJob
- `errorClass` / `errorMessage` ← Sidekiq error fields
- `attempts` ← `retry_count + 1` (Sidekiq counts retries, not executions)

## Redis

A dump is an array of JSON strings taken from a list. Each string is decoded; Sidekiq-shaped jobs reuse the Sidekiq adapter, everything else uses the generic mapping under the `redis` label. Do not require redis-cli encoding (`*3\r\n...`) in v1. Hashes are not supported yet.

## Generic JSONL

Minimal useful record:

```json
{"id":"job-1","queue":"orders","payload":{"orderId":9},"error":"Timeout","attempts":8}
```

`error` may be a string or `{ "class": "...", "message": "..." }`.

## Format Detection

One producer per dump. Each record is fingerprinted by its keys:

| Producer | Keys |
| --- | --- |
| `sqs` | string `MessageId` and a `Body` |
| `sidekiq` | string `error_class`, or string `class` with an `args` array |
| `generic` | `payload`, an `error` string or object, or numeric `attempts` |

Records that match nothing are ignored for detection and go through whichever adapter the rest of the file uses. The first recognized record decides the producer. If any other record fingerprints differently, the file is rejected with `MixedDumpError` and a count such as `2 of 40 records do not look like sqs`, rather than silently running two adapters over one file.

## Poison (v1 rules)

A job is **poison** when either:

1. `attempts` is at or above a configurable threshold (default 10), or
2. the same `payloadText` appears at least N times (default 3) with the same `errorClass`

Operators can override by hand. Poison jobs are excluded from the default retry export.
