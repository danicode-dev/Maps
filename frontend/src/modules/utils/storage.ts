const ACTIVE_GROUP_KEY = "granada.activeGroupId";

export function getActiveGroupId(): number | null {
  const raw = localStorage.getItem(ACTIVE_GROUP_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

export function setActiveGroupId(groupId: number | null) {
  if (groupId === null) {
    localStorage.removeItem(ACTIVE_GROUP_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_GROUP_KEY, groupId.toString());
}
