# Setup

Queuepeek is a Vite app. Node.js 20+ is enough.

```text
npm install
npm run dev
```

The workbench is at the URL Vite prints (usually `http://localhost:5173`). Drop `samples/sidekiq/dead-set.json` on the stage: the groups appear on the left, the largest group's jobs in the middle, and its sample job's payload on the right. Pane layout is described in [workbench.md](workbench.md).

```text
npm test
```

Runs Vitest. Loader tests are in `tests/load.test.ts`, adapters in `tests/sqs.test.ts`, `tests/sidekiq.test.ts`, and `tests/generic.test.ts`, format detection in `tests/detect.test.ts`, and grouping in `tests/grouping.test.ts`. UI helpers that do not need a DOM (escaping, formatting, selection state, payload printing) have their own tests; the panes themselves are checked by hand. Failure messages are catalogued in [load-errors.md](load-errors.md).

```text
npm run build
```

Typechecks and emits `dist/`. There is no deploy workflow yet.

Sample dumps for later parser work are under `samples/`. See [fixtures.md](fixtures.md).
