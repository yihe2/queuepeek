# Weekly Commit Plan

This plan keeps the history realistic at **1-3 commits per work day** across **4-5 days**. Some days are a single landing. Longer days split into two or three related commits. Do not force a second commit if the work was one idea.

## Commit Pattern

- short day: one complete change (schema, parser fixture, or a layout pass)
- normal day: implementation + tests or docs
- long day: adapter, tests, then a small docs or UI polish commit

## Week-by-Week Commit Themes

### Week 1

1. initialize repository structure
2. add product README
3. add roadmap and milestone plan
4. add weekly commit plan
5. add early product backlog
6. document dump formats and the job model

### Week 2

1. add Vite and TypeScript toolchain
2. add Vitest
3. define canonical job types
4. stub format detection
5. add sample fixture folders
6. document how to drop a new fixture
7. tidy the empty workbench shell

### Week 3

1. parse JSON array dumps
2. parse JSONL dumps
3. surface parse errors with context
4. keep raw records beside normalized jobs
5. tests for both encodings
6. reject non-mapping roots
7. document load errors

### Week 4

1. add SQS record mapping
2. unwrap JSON string bodies
3. map receive count to attempts
4. add an SQS sample dump
5. tests for body shapes
6. preserve MessageId and ReceiptHandle fields
7. document SQS adapter limits

### Week 5

1. add Sidekiq dead-set mapping
2. add Redis list-of-JSON mapping
3. fingerprint format from keys
4. reject mixed-format files
5. tests for each adapter
6. document adapters
7. cleanup type names

### Week 6

1. group by error class
2. group by normalized message
3. compute group counts and queues
4. pick a sample payload per group
5. stable group ids
6. tests for missing errors
7. document grouping

### Week 7

1. file drop on the shell
2. job table
3. group sidebar
4. payload pane
5. status line for load errors
6. basic layout CSS
7. Thanksgiving-week buffer

### Week 8

1. filter by queue
2. filter by class
3. filter by min attempts
4. text search over payload and error
5. sort columns
6. tests for filter composition
7. polish empty filter results

### Week 9

1. payload JSON editor
2. validate JSON on blur
3. include-in-retry flag
4. bulk include a group
5. revert payload to raw
6. tests for edit + revert
7. freeze the MVP workbench

### Week 10

1. attempt-threshold poison rule
2. identical-payload poison rule
3. poison list view
4. manual poison override
5. tests for the rule engine
6. document poison heuristics
7. badge poison rows in the table

### Week 11

1. export retry batch
2. export leftover DLQ slice
3. export poison-only file
4. keep vendor ids on export
5. tests for export shapes
6. document export
7. download buttons in the UI

### Week 12

1. serialize a session
2. restore a session
3. recent session list
4. corrupt session errors
5. IndexedDB store
6. tests for round-trip
7. document session files

### Week 13

1. redact known secret keys in the UI
2. toggle redaction
3. leave exports untouched by default
4. tests for redaction paths
5. sample dump with a dummy secret
6. document what is and is not scrubbed
7. polish payload viewer

### Week 14

1. load a second dump for compare
2. new / gone / still-failing summaries
3. keep compare read-only
4. tests on before/after fixtures
5. document compare
6. screenshot the view
7. cleanup compare edge cases

### Week 15

1. production build
2. GitHub Pages workflow
3. README screenshots
4. coherent sample story
5. first-run empty state
6. table keyboard focus
7. cleanup deploy docs

### Week 16

1. spike SQS move-task-shaped export
2. spike Sidekiq retry JSON
3. keep-or-cut decision
4. remove the spike if it is not useful offline
5. do not add AWS SDK calls
6. document the decision
7. stabilize remaining export paths

### Week 17

1. virtualize the table for large dumps
2. JSONL line numbers on parse errors
3. fix poison false positives
4. remove leftover TODOs
5. re-check first-run
6. holiday buffer / small fixes

### Week 18

1. prepare release checklist
2. finalize README
3. refresh screenshots
4. write changelog
5. cut version 1.0.0
6. write retrospective
7. archive post-release ideas

## Notes

- If a day only produces one real change, leave it as one commit.
- Avoid empty cosmetic commits that do not tell a story.
- Every week should leave parsers or the UI in a runnable state, even if the workbench is still a shell.
