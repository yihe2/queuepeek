# Error Grouping

Triage starts from groups, not individual jobs. `groupJobs` in `src/grouping/` turns a list of jobs into error groups, largest first.

## Group Key

A group is one **error class** plus one **normalized message**.

- The class is `job.errorClass` with surrounding whitespace removed.
- The message is `job.errorMessage` after masking (below).
- Jobs with neither land in a single `(no error)` group. Jobs with a message but no class are labelled `(no error class)`.

Two Lambda timeouts with different durations end up in one group. A timeout and a card decline never share a group, even if their messages happen to match.

## Message Masking

Parts of a message that change per job are replaced before comparing, in this order:

| Pattern | Example | Becomes |
| --- | --- | --- |
| UUID | `order 5f1c2a9e-3b7d-4c11-9a2e-8d4f0b6e71a1 not found` | `order <uuid> not found` |
| `0x` hex | `#<Order:0x00007f8b1c2d3e40> is frozen` | `#<Order:<hex>> is frozen` |
| hex run of 16+ | `job 3f9b2c7d1e4a5b6c7d8e9f01 lost` | `job <id> lost` |
| double-quoted value | `unknown column "legacy_sku"` | `unknown column <str>` |
| number not glued to a word | `timed out after 30.00 seconds`, `5000ms` | `<n> seconds`, `<n>ms` |

Then whitespace is collapsed. Digits inside identifiers (`Base64`, `s3://`, `utf8`) are left alone. Single quotes are not masked because they appear as apostrophes (`Couldn't`) and Ruby backtick quoting (`` `strip' ``).

The masked message is what the workbench shows as the group's message. The original text stays on each job.

## Group Fields

| Field | Meaning |
| --- | --- |
| `id` | `g-` plus an 8-character FNV-1a hash of class and message |
| `count` | jobs in the group |
| `queues` | each queue with its job count, busiest first, ties by name |
| `maxAttempts` | highest attempt count among the jobs |
| `firstFailedAt` / `lastFailedAt` | earliest and latest readable `failedAt`; jobs without one are skipped |
| `sample` | first job, in dump order, carrying the group's most repeated payload |
| `jobs` | the members, in dump order |

## Ordering

Groups are sorted by `count` descending, then class, then message, using plain string comparison so the order is the same in every browser.

## Stable Ids

The id depends only on class and masked message. It does not change when the dump is reordered, reloaded, or exported again on another day, so the UI can keep a selection across reloads and a later dump compare can match groups.

A 32-bit hash can collide. With a few hundred groups per dump the chance is small, and a collision would only merge two groups' selection state, never their jobs.

## Known Gaps

- No fuzzy matching. Two messages that differ by a word stay separate groups.
- Masking patterns are tuned for Ruby, Node, Python, and AWS error text. Unusual formats may need new patterns.
- Grouping ignores the payload. Two different bugs with the same exception and message share a group; poison rules are what look at payloads.
