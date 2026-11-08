# Poison Messages

A dead-letter queue mixes two kinds of failure. Some jobs failed for a reason that has since gone away (a deploy, a timeout, a downstream outage) and will succeed if retried. Others will fail every time until someone changes the data or the code. Queuepeek calls the second kind **poison** and keeps them out of retry batches by default, so a redrive does not just refill the DLQ.

The rules live in `src/poison.ts`. They run once over the whole dump when it loads, not over the filtered view, so a filter never changes whether a job is poison.

## Rules

| Rule | Fires when | Default |
| --- | --- | --- |
| Attempt threshold | `attempts` is at or above the limit | 10 |
| Identical payload | the same payload failed with the same error at least N times | 3 |

A job can match both; the payload pane lists every reason.

### Attempt threshold

The attempt count means different things per producer (see [adapters.md](adapters.md)): Sidekiq's `retry_count + 1`, SQS's `ApproximateReceiveCount`, or whatever the generic record called it. Sidekiq's default retry schedule gives up after 25 tries, so a dead job with 10+ attempts has had hours or days of chances. SQS messages usually reach the DLQ after a small `maxReceiveCount`, so most SQS jobs will not trip this rule; the identical-payload rule matters more there.

### Identical payload

"Same error" uses the grouping key: trimmed error class plus the masked message (see [grouping.md](grouping.md)), so two declines for different card numbers count as the same failure. "Same payload" compares payload text with surrounding whitespace removed. Key order and formatting inside the payload still matter, so `{"a":1,"b":2}` and `{"b":2,"a":1}` are different payloads.

When a group of copies reaches the limit, every copy is flagged, not just the later ones. Retrying any of them hits the same bug.

A limit below 2 is ignored, since every job trivially matches itself.

## Overrides

The rules are guesses. The payload pane shows the verdict with a button to flip it:

- **Not poison** on a flagged job records a "clear" override. The rule's reasons stay visible with a note that it was cleared by hand.
- **Mark as poison** on a clean job records a "poison" override.
- Flipping a job back to what the rules say drops the override, so there is never an override that agrees with the rules.

Overrides are in memory and reset when a new dump is loaded.

## Where Poison Shows Up

- A red `poison` tag on the job's row.
- A **Set aside** entry at the bottom of the sidebar listing every poison job. The jobs also stay in their error groups.
- The status line's poison count.
- **Include all** in the table header skips poison jobs. You can still tick one by hand; the top bar then warns how many poison jobs are in the batch.

## Known Gaps

- Thresholds are not adjustable in the UI yet.
- No payload-shape rules (missing required field, unknown enum value). Those need a schema, which a dump does not carry.
- Nothing looks at timing, such as a job that failed instantly on every attempt.
