# Queuepeek Roadmap

## Timeline

- Start: **September 1, 2026**
- End: **December 31, 2026**
- Working cadence: **4-5 days per week**
- Commit target: **1-3 commits per work day** (not a fixed count)
- Total target: **120-160 commits**

## Phase 1: Foundation

### Week 1: September 1 - September 6

- create repo structure
- write the product README
- lock the 18-week plan
- capture parser and poison-message questions
- define dump formats and the canonical job model

### Week 2: September 7 - September 13

- add Vite + TypeScript
- add Vitest
- define `Job` / `DumpBatch` types
- stub format detection
- add a fixture folder under `samples/`
- document how to add a fixture

### Week 3: September 14 - September 20

- parse generic JSON arrays
- parse JSONL (one job per line)
- reject empty / non-object roots with clear errors
- preserve raw records for later export
- tests for both encodings

### Week 4: September 21 - September 27

- SQS-shaped records (`Body`, `MessageId`, `Attributes`)
- unwrap `Body` when it is a JSON string
- map `ApproximateReceiveCount` to attempts
- sample SQS DLQ fixture
- tests for string vs object bodies

## Phase 2: MVP Workbench

### Week 5: September 28 - October 4

- Sidekiq dead-set records (`error_class`, `error_message`, `wrap_json`, `failed_at`)
- Redis list dumps of job JSON
- format fingerprinting (do not require the user to pick a vendor first)
- tests that mixed files fail loudly
- document each adapter

### Week 6: October 5 - October 11

- group jobs by error class
- secondary group by normalized message
- counts, queues, and sample payload per group
- stable group ids for UI selection
- tests for grouping edge cases (missing error, empty message)

### Week 7: October 12 - October 18

- shell UI: file drop + job table
- show group sidebar
- select a job and view payload JSON
- status line: loaded count, parse errors
- Canadian Thanksgiving week: keep the shell working, avoid new adapters

### Week 8: October 19 - October 25

- filters: queue, class, min attempts, text search
- sort by failed-at, attempts, queue
- hide parsed-ok vs parse-error rows
- URL-free filter state in memory
- tests for filter composition

### Week 9: October 26 - November 1

- payload editor (JSON text, validate on blur)
- per-job "include in retry batch" flag
- bulk include a whole error group
- revert payload to raw
- freeze MVP: load, group, filter, edit

## Phase 3: Poison, Export, Sessions

### Week 10: November 2 - November 8

- poison rules: attempt threshold
- poison rules: identical payload seen N times with the same error
- poison list view (separate from retry)
- override: mark / unmark poison by hand
- tests for the rule engine

### Week 11: November 9 - November 15

- export retry batch JSON
- export leftover DLQ slice
- export poison-only file
- keep original ids where vendors need them
- document export shapes

### Week 12: November 16 - November 22

- save a triage session (file name, filters, edits, flags)
- restore a session
- list recent sessions
- handle corrupt session JSON
- IndexedDB if localStorage is too small

### Week 13: November 23 - November 29

- redaction pass for common secret keys (`password`, `token`, `authorization`)
- optional hide payload fields in the table
- do not redact the export unless asked
- tests for redaction paths
- sample that includes a secret so the UI can be demoed safely

### Week 14: November 30 - December 6

- compare two dumps (new ids, gone ids, still-failing payloads)
- show a short delta summary
- keep compare read-only
- tests on synthetic before/after fixtures
- screenshot the compare view for README later

## Phase 4: Polish And Release

### Week 15: December 7 - December 13

- GitHub Pages or static preview build
- README screenshots of groups + editor
- sample dumps that tell a coherent story (orders, mailer, payments)
- first-run copy when no file is loaded
- keyboard focus in the table

### Week 16: December 14 - December 20

- spike: generate an SQS `StartMessageMoveTask`-shaped export
- spike: Sidekiq retry JSON
- keep-or-cut: only keep if the shape is actually useful offline
- do not add live AWS SDK calls
- write the decision down

### Week 17: December 21 - December 27

- bug-fix week (holiday hours)
- large-file behavior (5k–20k jobs): virtualize the table if needed
- parse error line numbers for JSONL
- remove leftover TODOs
- re-check first-run on a clean browser profile

### Week 18: December 28 - December 31

- cut `v1.0.0`
- changelog
- final README pass
- retrospective
- park post-1.0 ideas (live brokers, PII classifiers, shared review links)

## Scope Guardrails

If you start falling behind, cut in this order:

1. dump compare
2. vendor-shaped retry exports (keep generic JSON)
3. session restore beyond a single autosave
4. redaction

Do not cut:

- SQS + Sidekiq + generic parsers
- grouping by error
- payload edit
- poison list
- retry / leftover export
- parser tests
- sample dumps
- documentation
