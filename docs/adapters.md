# Adapters

An adapter turns one vendor's record into a canonical `Job`. `toJobs` in `src/adapters/index.ts` picks the adapter from the detected producer. Every adapter keeps the untouched record on `job.raw`.

| Producer | Adapter | Status |
| --- | --- | --- |
| `sqs` | `normalizeSqsRecord` | done |
| `sidekiq` | generic mapping with the `sidekiq` label | dedicated adapter next |
| `redis` | not detected yet | planned |
| `generic` / unknown | `normalizeGenericRecord` | done |

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

### Limits

- **No failure time.** SQS does not record when the last receive failed. `failedAt` is the original send time, so a redriven message looks older than its latest failure.
- **Attempts are approximate.** `ApproximateReceiveCount` is what SQS reports; it includes receives that timed out without a worker error.
- **Errors only come from Lambda-style attributes.** Lambda async DLQs set `ErrorCode` and `ErrorMessage`. Messages from other consumers usually carry no error at all and group as "no error" until you add attributes on the sending side.
- **Receipt handles go stale.** A handle is only valid while the message is in flight. Handles in an old dump are kept for reference, not for `DeleteMessage`.
- **Attribute names are case-sensitive.** The adapter reads `StringValue`, the casing the API and CLI return. Hand-written dumps with `stringValue` will lose their error fields.
- **Binary bodies are not decoded.** Base64 `BinaryValue` attributes and compressed bodies stay as text.
