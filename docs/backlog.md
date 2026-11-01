# Early Backlog

This backlog captures the first product questions and candidate tasks for Queuepeek.

## Core Questions

- what is the smallest canonical job record that still round-trips to SQS and Sidekiq exports
- when is a message poison versus just hot (retries will succeed after a code fix)
- should format detection be strict (one vendor per file) or allow mixed records
- how much of the payload editor belongs in v1 versus a full JSON IDE

## MVP Backlog

Workbench frozen; the remaining items belong to the poison and export phase.

- [x] JSON / JSONL loader
- [x] SQS DLQ adapter
- [x] Sidekiq dead-set adapter
- [x] generic job adapter
- [x] group by error
- [x] payload inspect / edit
- [ ] poison list
- [ ] retry and leftover exports
- [x] sample dumps
- [x] parser tests

## Decided During The MVP

- format detection is strict: a file with records from more than one producer is refused
- the payload editor is a plain textarea that checks JSON on blur, not a JSON IDE
- edits never modify parsed jobs; the original payload is always one click away

## Nice-To-Have Backlog

- Redis-specific dump quirks beyond "list of JSON"
- dump compare
- session restore
- UI redaction of secret keys
- vendor-shaped retry files (SQS move task, Sidekiq retry)
- virtualized table for very large dumps
