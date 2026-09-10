# Fixtures

Put dump files under `samples/<producer>/`. The workbench is not wired to load them yet; they exist so parsers can grow against a stable set of files.

## Layout

```text
samples/
  generic/     canonical JSON / JSONL
  sqs/         SQS ReceiveMessage-style JSON (later)
  sidekiq/     Sidekiq dead-set JSON (later)
```

## Adding A Fixture

1. Choose the producer folder. If the file is not vendor-shaped, use `generic/`.
2. Keep dumps small. A handful of jobs is enough; large files belong in `samples/large/` later if we need perf cases.
3. Prefer realistic keys (`orderId`, `template`) but no live secrets. Use `ops@example.com`, not a real mailbox.
4. If the dump is supposed to fail format detection, name it `mixed.*` or `invalid.*` and say why in a sibling `.md` note.
5. JSONL: one record per line, no trailing comma, blank lines allowed.

## Current Files

- `generic/orders.jsonl` — three failed jobs, two of them the same payload (poison-rule bait later)
- `generic/tiny.json` — a one-element JSON array for the array loader
