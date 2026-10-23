import { toJobs } from "./adapters";
import { assertSingleProducer, detectDumpFormat, MixedDumpError } from "./detect";
import { emptyFilter, filterJobs, filterOptions, type FilterOptions, type JobFilter } from "./filters";
import { groupJobs } from "./grouping";
import { DumpLoadError, parseDump } from "./load";
import {
  emptyState,
  loadGroups,
  selectedGroup,
  selectedJob,
  selectGroup,
  selectJob,
  type WorkbenchState,
} from "./state";
import "./styles.css";
import type { Job, ParseIssue } from "./types";
import { escapeHtml } from "./ui/escape";
import { readFilterBar, renderFilterBar, showFilterCount } from "./ui/filters";
import { plural } from "./ui/format";
import { renderPayload } from "./ui/payload";
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
      <div class="load-error" id="load-error" role="alert" hidden></div>
      <ul class="issues" id="issues" hidden></ul>
      <form class="filter-bar" id="filters" hidden></form>
      <section class="jobs-panel" id="jobs"></section>
    </main>
    <aside class="inspector">
      <h2>Payload</h2>
      <div id="payload"></div>
    </aside>
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
const loadError = byId("load-error");
const issueList = byId("issues");
const filtersNode = byId<HTMLFormElement>("filters");
const groupsNode = byId("groups");
const jobsNode = byId("jobs");
const payloadNode = byId("payload");
const status = byId("status");

const MAX_SHOWN_ISSUES = 20;

let state: WorkbenchState = emptyState;
let jobs: Job[] = [];
let options: FilterOptions = filterOptions([]);
let filter: JobFilter = emptyFilter;

function applyFilter(): void {
  const shown = filterJobs(jobs, filter);
  state = loadGroups(groupJobs(shown), state);
  showFilterCount(filtersNode, shown.length, jobs.length);
  render();
}

function resetFilters(loaded: Job[]): void {
  jobs = loaded;
  options = filterOptions(loaded);
  filter = emptyFilter;
  renderFilterBar(filtersNode, options, filter);
  filtersNode.toggleAttribute("hidden", loaded.length === 0);
}

function render(): void {
  renderGroupList(groupsNode, state.groups, state.selectedGroupId);
  renderJobTable(jobsNode, selectedGroup(state), state.selectedJobId);
  renderPayload(payloadNode, selectedJob(state));
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

function showLoadError(message: string | null): void {
  loadError.textContent = message ?? "";
  loadError.toggleAttribute("hidden", message === null);
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
      const loaded = toJobs(records, detection.producer);

      resetFilters(loaded);
      applyFilter();
      dropzone.classList.add("is-compact");
      showLoadError(null);
      renderIssues(issues);
      status.textContent =
        `${plural(loaded.length, "job")} · ${plural(state.groups.length, "group")} · ${detection.producer} · ` +
        `${plural(issues.length, "parse issue")}`;
    })
    .catch((error: unknown) => {
      const message =
        error instanceof DumpLoadError || error instanceof MixedDumpError
          ? error.message
          : `Could not read ${file.name}.`;
      state = emptyState;
      resetFilters([]);
      dropzone.classList.remove("is-compact");
      showLoadError(message);
      renderIssues([]);
      render();
      status.textContent = "No dump loaded.";
    });
}

groupsNode.addEventListener("click", (event) => {
  const groupId = closestData(event, "data-group-id")?.dataset.groupId;
  if (groupId) {
    state = selectGroup(state, groupId);
    render();
  }
});

filtersNode.addEventListener("input", () => {
  filter = readFilterBar(filtersNode, options);
  applyFilter();
});

filtersNode.addEventListener("submit", (event) => {
  event.preventDefault();
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
