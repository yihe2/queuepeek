# Setup

Queuepeek is a Vite app. Node.js 20+ is enough.

```text
npm install
npm run dev
```

The workbench is at the URL Vite prints (usually `http://localhost:5173`). You can drop a file on the stage; the parser is not attached yet, so only the file name is shown.

```text
npm test
```

Runs Vitest. Format detection tests live in `tests/detect.test.ts`.

```text
npm run build
```

Typechecks and emits `dist/`. There is no deploy workflow yet.

Sample dumps for later parser work are under `samples/`. See [fixtures.md](fixtures.md).
