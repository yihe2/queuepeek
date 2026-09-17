# Load Errors

Queuepeek separates two kinds of problems. A **load error** means the file cannot be read as a dump at all, so nothing is shown. A **parse issue** means one record was skipped while the rest loaded.

## Load Errors

These throw `DumpLoadError` and leave the workbench empty.

| Message | Cause | Fix |
| --- | --- | --- |
| `Dump file is empty.` | File is blank or whitespace | Re-export the queue |
| `Dump is not valid JSON: ...` | Truncated or malformed file | Check the export finished; try the `.jsonl` path instead |
| `Dump root must be an array or object, found string.` | Root is a scalar | Wrap records in an array |
| `Dump object has no record array.` | Object root without a known key | Rename the array to `Messages`, `jobs`, `dead`, `records`, or `items` |
| `Dump file has no records.` | JSONL file of blank lines only | Re-export the queue |

## Parse Issues

These are collected and reported per record. Loading continues.

- `Expected an object, found number.` — a scalar inside the record array
- `Line is not valid JSON: ...` — one bad JSONL line; other lines still load

Issues carry a `line` for JSONL and a record `index` for JSON arrays, so the workbench can say `line 42` instead of "something failed".

## Choosing A Loader

`parseDump` picks by extension first: `.jsonl` is line-delimited, `.json` is a single document. For any other name it sniffs the first non-whitespace character — a leading `[` means one JSON document, anything else is treated as JSONL.

A file that mixes both shapes will surface as a pile of parse issues rather than a silent partial load.
