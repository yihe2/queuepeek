import type { ErrorGroup } from "./grouping";
import type { Job } from "./types";

export type WorkbenchState = {
  groups: ErrorGroup[];
  selectedGroupId: string | null;
  selectedJobId: string | null;
};

export const emptyState: WorkbenchState = {
  groups: [],
  selectedGroupId: null,
  selectedJobId: null,
};

function focusGroup(groups: ErrorGroup[], group: ErrorGroup | undefined): WorkbenchState {
  if (!group) {
    return { groups, selectedGroupId: null, selectedJobId: null };
  }
  return { groups, selectedGroupId: group.id, selectedJobId: group.sample.id };
}

/**
 * Replaces the loaded groups. Group ids are stable, so reloading a newer dump of the same
 * queue, or changing a filter, keeps the operator on the group they were looking at when it
 * still exists, and on the same job when that job is still in it.
 */
export function loadGroups(groups: ErrorGroup[], previous: WorkbenchState = emptyState): WorkbenchState {
  const kept = groups.find((group) => group.id === previous.selectedGroupId);
  if (kept?.jobs.some((job) => job.id === previous.selectedJobId)) {
    return { groups, selectedGroupId: kept.id, selectedJobId: previous.selectedJobId };
  }
  return focusGroup(groups, kept ?? groups[0]);
}

export function selectedGroup(state: WorkbenchState): ErrorGroup | null {
  return state.groups.find((group) => group.id === state.selectedGroupId) ?? null;
}

export function selectedJob(state: WorkbenchState): Job | null {
  return selectedGroup(state)?.jobs.find((job) => job.id === state.selectedJobId) ?? null;
}

export function selectGroup(state: WorkbenchState, groupId: string): WorkbenchState {
  const group = state.groups.find((candidate) => candidate.id === groupId);
  return group ? focusGroup(state.groups, group) : state;
}

export function selectJob(state: WorkbenchState, jobId: string): WorkbenchState {
  const group = selectedGroup(state);
  if (!group?.jobs.some((job) => job.id === jobId)) {
    return state;
  }
  return { ...state, selectedJobId: jobId };
}
