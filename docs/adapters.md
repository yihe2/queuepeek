# Adapters

An adapter turns one vendor's record into a canonical `Job`. `toJobs` in `src/adapters/index.ts` picks the adapter from the detected producer. Every adapter keeps the untouched record on `job.raw`.

| Producer | Adapter | Status |
| --- | --- | --- |
| `sqs` | `normalizeSqsRecord` | done |
| `sidekiq` | `normalizeSidekiqRecord` | done |
| `redis` | `normalizeGenericRecord` with the `redis` label | done |
| `generic` / unknown | `normalizeGenericRecord` | done |

Before any adapter runs, the workbench rejects a dump whose records fingerprint as more than one producer. See [Format detection](dump-formats.md#format-detection).

## SQS

Input is a `ReceiveMessage`-style record, usually from `aws sqs receive-message --attribute-names All --message-attribute-names All` or a script that saves the same shape.

| Job field | Source |
| --- | --- |
| `id` | `MessageId` |
| `payloadText` | `Body`, exactly as SQS returned it |
| `payload` | `Body` parsed as JSON; SNS envelopes are unwrapped to their inner `Message` |
| `attempts` | `Attributes.ApproximateReceiveCount` |
| `failedAt` | `Attributes.SentTimestamp` as ISO |
| `queue` | last segment of `Attributes.DeadLetterQueueSourceArn`, else of `QueueUrl` |
| `errorClass` | `MessageAttributes.ErrorType`, else `ErrorCode` |
| `errorMessage` | `MessageAttributes.ErrorMessage` |

`sqsIdentity(job)` returns `MessageId` and `ReceiptHandle` from `raw` for exports.

### SQS Limits

- **No failure time.** SQS does not record when the last receive failed. `failedAt` is the original send time, so a redriven message looks older than its latest failure.
- **Attempts are approximate.** `ApproximateReceiveCount` is what SQS reports; it includes receives that timed out without a worker error.
- **Errors only come from Lambda-style attributes.** Lambda async DLQs set `ErrorCode` and `ErrorMessage`. Messages from other consumers usually carry no error at all and group as "no error" until you add attributes on the sending side.
- **Receipt handles go stale.** A handle is only valid while the message is in flight. Handles in an old dump are kept for reference, not for `DeleteMessage`.
- **Attribute names are case-sensitive.** The adapter reads `StringValue`, the casing the API and CLI return. Hand-written dumps with `stringValue` will lose their error fields.
- **Binary bodies are not decoded.** Base64 `BinaryValue` attributes and compressed bodies stay as text.

## Sidekiq

Input is the job hash Sidekiq keeps in the dead or retry set, for example from `Sidekiq::DeadSet.new.map(&:item).to_json` in a console.

| Job field | Source |
| --- | --- |
| `id` | `jid` |
| `queue` | `queue` |
| `payload` | `{ class, args }`, with ActiveJob wrappers unwrapped to `wrapped` and `args[0].arguments` |
| `payloadText` | `payload` serialized, so identical jobs compare equal |
| `errorClass` / `errorMessage` | `error_class` / `error_message` |
| `attempts` | `retry_count + 1`; `1` when retries were disabled but the job failed |
| `failedAt` | `failed_at`, from float seconds or Sidekiq 7 epoch milliseconds |

### Sidekiq Limits

- **Backtraces are not decoded.** `error_backtrace` is zlib-compressed and base64-encoded in Sidekiq 6+. It stays on `raw`.
- **Only the first ActiveJob argument hash is unwrapped.** Custom wrappers other than the stock `JobWrapper` keep their outer `class` and `args`.
- **Scheduled-set entries look like healthy jobs.** They have `class` and `args` but no error, so they load with an empty error class.

## Redis

Redis lists usually hold each job as a JSON string. A dump saved as a JSON array of strings (or JSONL whose lines are quoted strings) is decoded record by record and flagged `encoded`.

- If the decoded records are Sidekiq jobs, they use the Sidekiq adapter and keep the `sidekiq` label.
- Otherwise they use the generic mapping and get the `redis` label.

### Redis Limits

- **No `redis-cli` protocol output.** Lines like `1) "{\"class\"..."` are not parsed. Use `redis-cli --raw LRANGE key 0 -1 > dump.jsonl`, which writes one JSON object per line and loads as a plain Sidekiq or generic dump.
- **No hashes or sorted sets yet.** An object of `field -> JSON string` is rejected as having no record array.
- **The label only applies when every record was a string.** A dump that mixes objects and strings is treated as plain JSON.
