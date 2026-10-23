import { emptyFilter, type FilterOptions, type JobFilter } from "../filters";
import { escapeHtml } from "./escape";
import { plural, queueName } from "./format";

function className(errorClass: string): string {
  return errorClass === "" ? "(no error class)" : errorClass;
}

/** Option values are indexes into `values`, because an empty queue or class is a real choice distinct from "any". */
function optionList(values: string[], selected: string | null, label: (value: string) => string): string {
  const any = `<option value=""${selected === null ? " selected" : ""}>Any</option>`;
  return (
    any +
    values
      .map(
        (value, index) =>
          `<option value="${index}"${value === selected ? " selected" : ""}>${escapeHtml(label(value))}</option>`,
      )
      .join("")
  );
}

export function renderFilterBar(container: Element, options: FilterOptions, filter: JobFilter): void {
  container.innerHTML = `
    <label>
      <span>Queue</span>
      <select data-filter="queue">${optionList(options.queues, filter.queue, queueName)}</select>
    </label>
    <label>
      <span>Class</span>
      <select data-filter="errorClass">${optionList(options.classes, filter.errorClass, className)}</select>
    </label>
    <label class="attempts">
      <span>Min attempts</span>
      <input data-filter="minAttempts" type="number" min="0" step="1" value="${filter.minAttempts}" />
    </label>
    <label class="search">
      <span>Search</span>
      <input data-filter="text" type="search" placeholder="Payload, error, or job id" value="${escapeHtml(filter.text)}" />
    </label>
    <span class="filter-count" data-filter-count></span>`;
}

function control<T extends HTMLElement>(container: Element, name: string): T | null {
  return container.querySelector<T>(`[data-filter="${name}"]`);
}

function pick(values: string[], raw: string | undefined): string | null {
  if (raw === undefined || raw === "") {
    return null;
  }
  return values[Number(raw)] ?? null;
}

export function readFilterBar(container: Element, options: FilterOptions): JobFilter {
  const attempts = Math.floor(Number(control<HTMLInputElement>(container, "minAttempts")?.value ?? 0));

  return {
    ...emptyFilter,
    queue: pick(options.queues, control<HTMLSelectElement>(container, "queue")?.value),
    errorClass: pick(options.classes, control<HTMLSelectElement>(container, "errorClass")?.value),
    minAttempts: Number.isFinite(attempts) && attempts > 0 ? attempts : 0,
    text: control<HTMLInputElement>(container, "text")?.value ?? "",
  };
}

export function showFilterCount(container: Element, shown: number, total: number): void {
  const count = container.querySelector("[data-filter-count]");
  if (count) {
    count.textContent = shown === total ? plural(total, "job") : `${shown} of ${plural(total, "job")}`;
  }
}
