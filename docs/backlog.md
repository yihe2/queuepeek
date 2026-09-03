# Early Backlog

This backlog captures the first product questions and candidate tasks for Queuepeek.

## Core Questions

- what is the smallest canonical job record that still round-trips to SQS and Sidekiq exports
- when is a message poison versus just hot (retries will succeed after a code fix)
- should format detection be strict (one vendor per file) or allow mixed records
- how much of the payload editor belongs in v1 versus a full JSON IDE

## MVP Backlog

- JSON / JSONL loader
- SQS DLQ adapter
- Sidekiq dead-set adapter
- generic job adapter
- group by error
- payload inspect / edit
- poison list
- retry and leftover exports
- sample dumps
- parser tests

## Nice-To-Have Backlog

- Redis-specific dump quirks beyond "list of JSON"
- dump compare
- session restore
- UI redaction of secret keys
- vendor-shaped retry files (SQS move task, Sidekiq retry)
- virtualized table for very large dumps
