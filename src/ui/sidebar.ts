import { groupLabel, type ErrorGroup } from "../grouping";
import { escapeHtml } from "./escape";
import { queueSummary, truncate } from "./format";

const MESSAGE_PREVIEW = 90;

function renderGroup(group: ErrorGroup, selected: boolean): string {
  const message =
    group.message === "" ? "" : `<span class="group-message">${escapeHtml(truncate(group.message, MESSAGE_PREVIEW))}</span>`;

  return `
    <li>
      <button type="button" class="group${selected ? " is-selected" : ""}" data-group-id="${escapeHtml(group.id)}">
        <span class="group-head">
          <strong>${escapeHtml(groupLabel(group))}</strong>
          <span class="count">${group.count}</span>
        </span>
        ${message}
        <span class="group-queues">${escapeHtml(queueSummary(group.queues))}</span>
      </button>
    </li>`;
}

export function renderGroupList(
  container: Element,
  groups: ErrorGroup[],
  selectedId: string | null,
  emptyMessage = "No dump loaded.",
): void {
  if (groups.length === 0) {
    container.innerHTML = `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  container.innerHTML = `<ul class="group-list">${groups
    .map((group) => renderGroup(group, group.id === selectedId))
    .join("")}</ul>`;
}
