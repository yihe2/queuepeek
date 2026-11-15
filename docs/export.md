# Export Files

Queuepeek never talks to a broker. When triage is done it writes JSON files that a redrive script, a ticket, or the next on-call can act on.

## Three Files

Each job in the dump lands in exactly one file (`src/export/partition.ts`):

| File | Holds | Payload |
| --- | --- | --- |
| retry | jobs ticked **Include in retry batch**, poison or not | edited payload if there is one, else the original |
| poison | poison jobs that are not ticked | original |
| leftover | everything else | original |

Together they account for the whole dump, so nothing gets retried twice or silently dropped. Poison and leftover describe what is still sitting in the DLQ, so they always carry the payload exactly as dumped, even when an edit exists.

The buttons in the top bar show how many jobs each file would hold and are disabled when it would be empty. Filters do not change what is exported; a job hidden by a filter still lands in its file.

## Shape

```json
{
  "format": "queuepeek-export",
  "version": 1,
  "kind": "retry",
  "source": "orders-dlq.json",
  "exportedAt": "2026-11-13T19:42:00.000Z",
  "count": 1,
  "records": [
    {
      "id": "5f1c2a9e-3b7d-4c11-9a2e-8d4f0b6e71a1",
      "queue": "orders-dlq",
      "producer": "sqs",
      "payload": { "orderId": "ord_1001", "retry": true },
      "edited": true,
      "attempts": 4,
      "errorClass": "TimeoutError",
      "errorMessage": "Task timed out after 30.00 seconds",
      "failedAt": "2026-11-09T22:10:00.000Z",
      "vendor": { "messageId": "5f1c2a9e-3b7d-4c11-9a2e-8d4f0b6e71a1", "receiptHandle": "AQEB..." }
    }
  ]
}
```

- `payload` is JSON when the job's payload arrived as JSON, and a string when it arrived as plain text. Edited JSON is parsed back, so the file never holds JSON-inside-a-string.
- The error fields are the original failure, even next to an edited payload, so whoever runs the retry knows what it is meant to fix.
- `version` changes only if a field is removed or changes meaning. New fields may be added within version 1.

## Vendor Ids

`vendor` holds the fields a script needs to find or delete the original message (`src/export/vendor.ts`):

| Producer | Fields |
| --- | --- |
| SQS | `messageId`, `receiptHandle`, `md5OfBody` |
| Sidekiq | `jid`, `class` (as enqueued, so the ActiveJob wrapper rather than the wrapped job), `queue` |
| Redis, generic | none; use `id` |

Fields missing from the dump are left out rather than written as empty strings.

Receipt handles expire with the visibility timeout, so one from an old dump may no longer work for `DeleteMessage`. `md5OfBody` describes the original body; it will not match an edited payload.

## Refused Exports

A retry export is refused if any ticked job has an edited JSON payload that no longer parses. The status line names the jobs, and the workbench jumps to the first one with the editor focused. Fix the JSON or revert it, then export again. Poison and leftover exports are never refused, since they do not include edits.

## File Names

`<dump name>.<kind>.<UTC yyyymmdd-hhmm>.json`, for example `orders-dlq.retry.20261113-1942.json`. Spaces and other awkward characters in the dump name become `-`.

## Not Yet

- Vendor-shaped files (an SQS `SendMessageBatch` body, a Sidekiq retry set) are on the nice-to-have list. The generic shape above is enough to drive a short script for now.
