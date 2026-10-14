import { toJobs } from "./adapters";
import { assertSingleProducer, detectDumpFormat, MixedDumpError } from "./detect";
import { groupJobs } from "./grouping";
import { DumpLoadError, parseDump } from "./load";
import { emptyState, loadGroups, selectedGroup, selectGroup, selectJob, type WorkbenchState } from "./state";
import "./styles.css";
import type { ParseIssue } from "./types";
import { escapeHtml } from "./ui/escape";
import { plural } from "./ui/format";
import { renderGroupList } from "./ui/sidebar";
import { renderJobTable } from "./ui/table";

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
      <div id="groups"></div>
    </aside>
    <main class="stage">
      <label class="dropzone" id="dropzone">
        <input id="dump-file" type="file" accept=".json,.jsonl,application/json" />
        <strong>Drop a dump here</strong>
        <span>JSON or JSONL. Records are parsed locally; nothing leaves the browser.</span>
        <span class="file-meta" id="file-meta">No file selected.</span>
      </label>
      <ul class="issues" id="issues" hidden></ul>
      <section class="jobs-panel" id="jobs"></section>
    </main>
  </div>
  <footer class="status" id="status">No dump loaded.</footer>
`;

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing #${id}`);
  }
  return node as T;
}

const input = byId<HTMLInputElement>("dump-file");
const dropzone = byId("dropzone");
const fileMeta = byId("file-meta");
const issueList = byId("issues");
const groupsNode = byId("groups");
const jobsNode = byId("jobs");
const status = byId("status");

const MAX_SHOWN_ISSUES = 20;

let state: WorkbenchState = emptyState;

function render(): void {
  renderGroupList(groupsNode, state.groups, state.selectedGroupId);
  renderJobTable(jobsNode, selectedGroup(state), state.selectedJobId);
}

function locate(issue: ParseIssue): string {
  return issue.line === undefined ? `record ${issue.index}` : `line ${issue.line}`;
}

function renderIssues(issues: ParseIssue[]): void {
  issueList.innerHTML = issues
    .slice(0, MAX_SHOWN_ISSUES)
    .map((issue) => `<li><code>${locate(issue)}</code> ${escapeHtml(issue.message)}</li>`)
    .join("");

  if (issues.length > MAX_SHOWN_ISSUES) {
    issueList.innerHTML += `<li class="more">${issues.length - MAX_SHOWN_ISSUES} more skipped.</li>`;
  }

  issueList.toggleAttribute("hidden", issues.length === 0);
}

function closestData(event: Event, attribute: string): HTMLElement | null {
  return event.target instanceof Element ? event.target.closest<HTMLElement>(`[${attribute}]`) : null;
}

function loadFile(file: File): void {
  fileMeta.textContent = `${file.name} · ${file.size} bytes`;

  file
    .text()
    .then((text) => {
      const { records, issues } = parseDump(file.name, text);
      const encoded = records.length > 0 && records.every((entry) => entry.encoded);
      const detection = detectDumpFormat(
        records.map((entry) => entry.record),
        { encoded },
      );
      assertSingleProducer(detection);
      const jobs = toJobs(records, detection.producer);
      const groups = groupJobs(jobs);

      state = loadGroups(groups, state);
      dropzone.classList.add("is-compact");
      renderIssues(issues);
      render();
      status.textContent =
        `${plural(jobs.length, "job")} · ${plural(groups.length, "group")} · ${detection.producer} · ` +
        `${plural(issues.length, "parse issue")}`;
    })
    .catch((error: unknown) => {
      renderIssues([]);
      const message =
        error instanceof DumpLoadError || error instanceof MixedDumpError
          ? error.message
          : `Could not read ${file.name}.`;
      status.textContent = message;
    });
}

groupsNode.addEventListener("click", (event) => {
  const groupId = closestData(event, "data-group-id")?.dataset.groupId;
  if (groupId) {
    state = selectGroup(state, groupId);
    render();
  }
});

jobsNode.addEventListener("click", (event) => {
  const jobId = closestData(event, "data-job-id")?.dataset.jobId;
  if (jobId !== undefined) {
    state = selectJob(state, jobId);
    render();
  }
});

input.addEventListener("change", () => {
  const file = input.files?.[0];
  if (file) {
    loadFile(file);
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
    loadFile(file);
  }
});

render();
