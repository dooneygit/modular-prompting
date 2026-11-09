import type { Folder, LibraryData, Prompt } from "./promptStore";

// chrome.storage.sync limits each item to 8 KB, so the library is stored as one
// item per folder and per prompt. A prompt too big for one item keeps its
// metadata under its prompt key and its content in numbered part items.
const FOLDER_PREFIX = "folder:";
const PROMPT_PREFIX = "prompt:";
const RECOVERED_FOLDER: Folder = {
  id: "recovered",
  name: "Recovered",
  parentId: null,
};

type StoredFolder = Folder & { order: number };
type StoredPrompt = Omit<Prompt, "lastUsedAt"> & { parts?: number };
// updatedAt ties a part to its prompt's revision: content only changes along
// with updatedAt, and sync can deliver the items of one edit separately.
interface StoredPart {
  text: string;
  updatedAt: number;
}

const encoder = new TextEncoder();
const byteLength = (text: string) => encoder.encode(text).length;
const partKey = (promptId: string, index: number) =>
  `part:${promptId}:${index}`;

// Stored objects can come back with their keys reordered, so items are always
// compared in this form. Every stored item is a flat object.
export function canonicalJson(value: object): string {
  return JSON.stringify(value, Object.keys(value).sort());
}

// Chrome's own measure of an item: key length plus JSON-encoded value.
export function itemBytes(key: string, json: string): number {
  return byteLength(key) + byteLength(json);
}

function splitContent(content: string, maxBytes: number): string[] {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const char of content) {
    // Measured JSON-encoded because quotes and newlines take extra bytes.
    const size = byteLength(JSON.stringify(char)) - 2;
    if (bytes + size > maxBytes) {
      parts.push(part);
      part = "";
      bytes = 0;
    }
    part += char;
    bytes += size;
  }
  parts.push(part);
  return parts;
}

function addPrompt(
  items: Map<string, string>,
  { lastUsedAt: _deviceOnly, ...prompt }: Prompt
): void {
  const key = PROMPT_PREFIX + prompt.id;
  const whole = canonicalJson(prompt);
  const limit = chrome.storage.sync.QUOTA_BYTES_PER_ITEM;
  if (itemBytes(key, whole) <= limit) {
    items.set(key, whole);
    return;
  }
  const empty: StoredPart = { text: "", updatedAt: prompt.updatedAt };
  const room =
    limit - itemBytes(partKey(prompt.id, 9999), canonicalJson(empty));
  const parts = splitContent(prompt.content, room);
  items.set(key, canonicalJson({ ...prompt, content: "", parts: parts.length }));
  parts.forEach((text, index) => {
    items.set(
      partKey(prompt.id, index),
      canonicalJson({ text, updatedAt: prompt.updatedAt })
    );
  });
}

export function buildItems({
  folders,
  prompts,
}: LibraryData): Map<string, string> {
  const items = new Map<string, string>();
  // Sibling order is array order, which separate items would otherwise lose.
  folders.forEach((folder, order) => {
    items.set(FOLDER_PREFIX + folder.id, canonicalJson({ ...folder, order }));
  });
  for (const prompt of prompts) addPrompt(items, prompt);
  return items;
}

// Returns null while any part is missing or from another revision.
function readPrompt(
  stored: Record<string, unknown>,
  { parts, ...prompt }: StoredPrompt
): Prompt | null {
  if (parts === undefined) return prompt;
  let content = "";
  for (let index = 0; index < parts; index++) {
    const part = stored[partKey(prompt.id, index)] as StoredPart | undefined;
    if (part?.updatedAt !== prompt.updatedAt) return null;
    content += part.text;
  }
  return { ...prompt, content };
}

// Edits merged from two devices can leave a missing parent or a parent cycle,
// and a cycle would hang recursive tree walks.
function repairFolderTree(folders: Folder[]): void {
  const byId = new Map(folders.map((f) => [f.id, f]));
  for (const folder of folders) {
    const seen = new Set([folder.id]);
    let parentId = folder.parentId;
    while (parentId !== null) {
      const parent = byId.get(parentId);
      if (!parent || seen.has(parentId)) {
        folder.parentId = null;
        break;
      }
      seen.add(parentId);
      parentId = parent.parentId;
    }
  }
}

function recoverOrphans({ folders, prompts }: LibraryData): LibraryData {
  const folderIds = new Set(folders.map((f) => f.id));
  if (prompts.every((p) => folderIds.has(p.folderId))) {
    return { folders, prompts };
  }
  return {
    folders: folderIds.has(RECOVERED_FOLDER.id)
      ? folders
      : [...folders, RECOVERED_FOLDER],
    prompts: prompts.map((p) =>
      folderIds.has(p.folderId) ? p : { ...p, folderId: RECOVERED_FOLDER.id }
    ),
  };
}

export function parseItems(stored: Record<string, unknown>): LibraryData {
  const storedFolders: StoredFolder[] = [];
  const prompts: Prompt[] = [];
  for (const [key, value] of Object.entries(stored)) {
    if (key.startsWith(FOLDER_PREFIX)) {
      storedFolders.push(value as StoredFolder);
    } else if (key.startsWith(PROMPT_PREFIX)) {
      const prompt = readPrompt(stored, value as StoredPrompt);
      if (prompt) prompts.push(prompt);
    }
  }
  storedFolders.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  prompts.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

  const folders = storedFolders.map(({ order: _order, ...folder }) => folder);
  repairFolderTree(folders);
  return recoverOrphans({ folders, prompts });
}
