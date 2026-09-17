# Setup

Queuepeek is a Vite app. Node.js 20+ is enough.

```text
npm install
npm run dev
```

The workbench is at the URL Vite prints (usually `http://localhost:5173`). Drop `samples/generic/orders.jsonl` on the stage to see the loader report records, producer, and parse issues.

```text
npm test
```

Runs Vitest. Loader tests are in `tests/load.test.ts`, normalization in `tests/normalize.test.ts`, and format detection in `tests/detect.test.ts`. Failure messages are catalogued in [load-errors.md](load-errors.md).

```text
npm run build
```

Typechecks and emits `dist/`. There is no deploy workflow yet.

Sample dumps for later parser work are under `samples/`. See [fixtures.md](fixtures.md).
