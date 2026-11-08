import type { Folder, LibraryData, Prompt } from "./promptStore";

const FORMAT_VERSION = 1;
const INVALID_FILE = "This file isn't a valid prompt library export.";

export function downloadLibrary({ folders, prompts }: LibraryData): void {
  const file = { version: FORMAT_VERSION, exportedAt: Date.now(), folders, prompts };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `prompts-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFolder(value: unknown): Folder {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.parentId !== null && typeof value.parentId !== "string")
  ) {
    throw new Error(INVALID_FILE);
  }
  return { id: value.id, name: value.name, parentId: value.parentId };
}

function parsePrompt(value: unknown): Prompt {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.content !== "string" ||
    typeof value.folderId !== "string" ||
    typeof value.createdAt !== "number" ||
    typeof value.updatedAt !== "number" ||
    (value.lastUsedAt !== undefined && typeof value.lastUsedAt !== "number") ||
    typeof value.favorited !== "boolean"
  ) {
    throw new Error(INVALID_FILE);
  }
  return {
    id: value.id,
    title: value.title,
    content: value.content,
    folderId: value.folderId,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastUsedAt: value.lastUsedAt,
    favorited: value.favorited,
  };
}

// A parent cycle would hide the folders and hang recursive tree walks.
function assertFolderTree(folders: Folder[]): void {
  const byId = new Map(folders.map((f) => [f.id, f]));
  if (byId.size !== folders.length) throw new Error(INVALID_FILE);
  for (const folder of folders) {
    const seen = new Set<string>();
    let current: Folder | undefined = folder;
    while (current) {
      if (seen.has(current.id)) throw new Error(INVALID_FILE);
      seen.add(current.id);
      if (current.parentId === null) break;
      current = byId.get(current.parentId);
      if (!current) throw new Error(INVALID_FILE);
    }
  }
}

export function parseLibrary(text: string): LibraryData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(INVALID_FILE);
  }
  if (
    !isRecord(raw) ||
    raw.version !== FORMAT_VERSION ||
    !Array.isArray(raw.folders) ||
    !Array.isArray(raw.prompts)
  ) {
    throw new Error(INVALID_FILE);
  }

  const folders = raw.folders.map(parseFolder);
  const prompts = raw.prompts.map(parsePrompt);
  assertFolderTree(folders);
  const folderIds = new Set(folders.map((f) => f.id));
  if (prompts.some((p) => !folderIds.has(p.folderId))) {
    throw new Error(INVALID_FILE);
  }
  if (folders.length === 0) {
    throw new Error("This file has no folders or prompts to import.");
  }
  return { folders, prompts };
}

// The store persists as one JSON string, so a write over quota would fail
// after the import already looked successful in memory.
export async function assertFitsInStorage(data: LibraryData): Promise<void> {
  const used = await chrome.storage.local.getBytesInUse(null);
  const added = new Blob([JSON.stringify(JSON.stringify(data))]).size;
  if (used + added > chrome.storage.local.QUOTA_BYTES) {
    throw new Error("Not enough storage space to import this file.");
  }
}
