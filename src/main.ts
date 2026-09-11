import "./styles.css";

const root = document.querySelector("#app");

if (root) {
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
        <p class="empty">Load a JSON or JSONL dump to start triage.</p>
      </main>
    </div>
    <footer class="status">0 jobs · 0 groups · 0 parse issues</footer>
  `;
}
