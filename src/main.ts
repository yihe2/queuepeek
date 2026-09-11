import "./styles.css";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("Missing #app root");
}

root.innerHTML = `
  <header class="topbar">
    <h1>Queuepeek</h1>
    <p>Dead-letter workbench</p>
  </header>
  <div class="workspace">
    <aside class="sidebar">
      <h2>Groups</h2>
      <p class="empty">No dump loaded.</p>
    </aside>
    <main class="stage">
      <h2>Jobs</h2>
      <label class="dropzone" id="dropzone">
        <input id="dump-file" type="file" accept=".json,.jsonl,application/json" />
        <strong>Drop a dump here</strong>
        <span>JSON or JSONL. Parsing is not wired yet; the file name is recorded only.</span>
        <span class="file-meta" id="file-meta">No file selected.</span>
      </label>
    </main>
  </div>
  <footer class="status" id="status">0 jobs · 0 groups · 0 parse issues</footer>
`;

const input = document.querySelector<HTMLInputElement>("#dump-file");
const dropzone = document.querySelector("#dropzone");
const fileMeta = document.querySelector("#file-meta");
const status = document.querySelector("#status");

if (!input || !dropzone || !fileMeta || !status) {
  throw new Error("Missing workbench nodes");
}

function describeFile(file: File): void {
  fileMeta.textContent = `${file.name} · ${file.size} bytes`;
  status.textContent = `selected ${file.name} · parser not attached`;
}

input.addEventListener("change", () => {
  const file = input.files?.[0];
  if (file) {
    describeFile(file);
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-hot");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("is-hot");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-hot");
  if (!(event instanceof DragEvent)) {
    return;
  }
  const file = event.dataTransfer?.files[0];
  if (file) {
    describeFile(file);
  }
});
