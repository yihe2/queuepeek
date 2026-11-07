import { toJobs } from "./adapters";
import { assertSingleProducer, detectDumpFormat, MixedDumpError } from "./detect";
import { editPayload, isEdited, noEdits, retrySummary, revertPayload, setIncluded, type Edits } from "./edits";
import { emptyFilter, filterJobs, filterOptions, type FilterOptions, type JobFilter } from "./filters";
import { groupJobs } from "./grouping";
import {
  describeReason,
  findPoison,
  isPoison,
  noOverrides,
  POISON_GROUP_ID,
  poisonGroup,
  poisonJobs,
  poisonReasons,
  togglePoison,
  type PoisonOverrides,
  type PoisonReport,
} from "./poison";
import { dumpOrder, nextSort, type JobSort, type SortKey } from "./sorting";
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
import { readFilterBar, renderFilterBar, renderNoMatches, showFilterCount } from "./ui/filters";
import { plural } from "./ui/format";
import { prettyPayload, renderPayload, showPayloadCheck, type PoisonView } from "./ui/payload";
import { renderGroupList } from "./ui/sidebar";
import { markEdited, renderJobTable } from "./ui/table";

const root = document.querySelector("#app");

if (!root) {
  throw new Error("Missing #app root");
}

root.innerHTML = `
  <header class="topbar">
    <h1>Queuepeek</h1>
    <p>Dead-letter workbench</p>
    <p class="retry-summary" id="retry-summary"></p>
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
const retryNode = byId("retry-summary");

const MAX_SHOWN_ISSUES = 20;

let state: WorkbenchState = emptyState;
let jobs: Job[] = [];
let options: FilterOptions = filterOptions([]);
let filter: JobFilter = emptyFilter;
let sort: JobSort = dumpOrder;
let edits: Edits = noEdits;
let report: PoisonReport = findPoison([]);
let overrides: PoisonOverrides = noOverrides;

const poisoned = (jobId: string) => isPoison(report, overrides, jobId);

function poisonView(job: Job | null): PoisonView {
  return {
    poison: job !== null && poisoned(job.id),
    reasons: job === null ? [] : poisonReasons(report, job.id).map(describeReason),
    mark: job === null ? undefined : overrides.get(job.id),
  };
}

function applyFilter(): void {
  const shown = filterJobs(jobs, filter);
  const groups = groupJobs(shown);
  const poison = poisonGroup(poisonJobs(shown, report, overrides));
  state = loadGroups(poison ? [...groups, poison] : groups, state);
  showFilterCount(filtersNode, filter, shown.length, jobs.length);
  render();
}

function clearFilters(): void {
  filter = emptyFilter;
  renderFilterBar(filtersNode, options, filter);
  applyFilter();
}

function resetFilters(loaded: Job[]): void {
  jobs = loaded;
  options = filterOptions(loaded);
  filter = emptyFilter;
  renderFilterBar(filtersNode, options, filter);
  filtersNode.toggleAttribute("hidden", loaded.length === 0);
}

function render(): void {
  const noMatches = jobs.length > 0 && state.groups.length === 0;

  renderGroupList(groupsNode, state.groups, state.selectedGroupId, noMatches ? "No groups match." : undefined);
  if (noMatches) {
    renderNoMatches(jobsNode, jobs.length);
  } else {
    renderJobTable(jobsNode, selectedGroup(state), state.selectedJobId, sort, edits, poisoned);
  }
  const job = selectedJob(state);
  renderPayload(payloadNode, job, edits, poisonView(job));
  renderRetrySummary();
}

function renderRetrySummary(): void {
  const { included, edited, invalid } = retrySummary(jobs, edits);
  const parts = [`${included} in retry batch`, `${edited} edited`];
  if (invalid > 0) {
    parts.push(`${invalid} invalid`);
  }
  retryNode.textContent = jobs.length === 0 ? "" : parts.join(" · ");
  retryNode.classList.toggle("has-invalid", invalid > 0);
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

/**
 * Handled on click rather than change: by the time change fires, a row click may already
 * have redrawn the table and detached the checkbox.
 */
function toggleInclude(event: Event): boolean {
  const box = event.target;
  if (!(box instanceof HTMLInputElement) || box.dataset.includeJob === undefined) {
    return false;
  }
  edits = setIncluded(edits, [box.dataset.includeJob], box.checked);
  render();
  return true;
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

      edits = noEdits;
      report = findPoison(loaded);
      overrides = noOverrides;
      resetFilters(loaded);
      applyFilter();
      dropzone.classList.add("is-compact");
      showLoadError(null);
      renderIssues(issues);
      status.textContent =
        `${plural(loaded.length, "job")} · ` +
        `${plural(state.groups.filter((group) => group.id !== POISON_GROUP_ID).length, "group")} · ` +
        `${plural(poisonJobs(loaded, report, overrides).length, "poison job")} · ${detection.producer} · ` +
        `${plural(issues.length, "parse issue")}`;
    })
    .catch((error: unknown) => {
      const message =
        error instanceof DumpLoadError || error instanceof MixedDumpError
          ? error.message
          : `Could not read ${file.name}.`;
      state = emptyState;
      edits = noEdits;
      report = findPoison([]);
      overrides = noOverrides;
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

root.addEventListener("click", (event) => {
  if (closestData(event, "data-clear-filters")) {
    clearFilters();
  }
});

jobsNode.addEventListener("click", (event) => {
  if (toggleInclude(event)) {
    return;
  }

  const bulk = closestData(event, "data-include-group")?.dataset.includeGroup;
  const group = selectedGroup(state);
  if (bulk && group) {
    edits = setIncluded(edits, group.jobs.map((job) => job.id), bulk === "on");
    render();
    return;
  }

  const sortKey = closestData(event, "data-sort")?.dataset.sort;
  if (sortKey) {
    sort = nextSort(sort, sortKey as SortKey);
    render();
    return;
  }

  const jobId = closestData(event, "data-job-id")?.dataset.jobId;
  if (jobId !== undefined) {
    state = selectJob(state, jobId);
    render();
  }
});

payloadNode.addEventListener("focusout", (event) => {
  const job = selectedJob(state);
  if (!job || !(event.target instanceof HTMLTextAreaElement) || !event.target.hasAttribute("data-payload-editor")) {
    return;
  }
  edits = editPayload(edits, job.id, event.target.value, prettyPayload(job));
  showPayloadCheck(payloadNode, job, edits);
  markEdited(jobsNode, job.id, isEdited(edits, job.id));
  renderRetrySummary();
});

payloadNode.addEventListener("click", (event) => {
  if (toggleInclude(event)) {
    return;
  }

  const job = selectedJob(state);
  if (job && closestData(event, "data-revert-payload")) {
    edits = revertPayload(edits, job.id);
    render();
  } else if (job && closestData(event, "data-toggle-poison")) {
    overrides = togglePoison(report, overrides, job.id);
    applyFilter();
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
