# Cloud Sync Architecture (Firestore + Firebase Auth)

Status: proposal. No implementation yet.

## 0. Current state (what we're building on)

**Store** — `src/store/promptStore.ts`
- One Zustand store, `persist` middleware, version `6`.
- Persisted as a single JSON string under `chrome.storage.local["prompt-vault-storage"]`
  (`STORAGE_KEY` in `src/store/chromeStorage.ts`), shape `{ state, version }`.
- `partialize` mixes **library data** (`folders`, `prompts`) with **per-device UI state**
  (`editorNodes`, `tabs`, `activeTabId`, `inPagePanelEnabled`, panel widths, `editorOpen`).
- `Prompt`: `id, title, content, folderId, createdAt, updatedAt, lastUsedAt?, favorited`.
- `Folder`: `id, name, parentId` — **no timestamps**. Root folder order = array order.
- Deletes are hard removals; `deleteFolder` cascades to descendant folders and their prompts.
- `togglePromptFavorite` and `touchPrompt` do **not** bump `updatedAt`.

**Contexts** — the store lives in the popup (`src/popup/main.tsx`) and in content scripts
(`src/content/index.ts`). Both rehydrate on `chrome.storage.onChanged` (`src/store/sync.ts`).

**Background** — `src/background/index.ts` is a stub (install log + ping). Manifest declares
`background.service_worker` only; permissions are `storage`, `clipboardWrite`.

**Implication:** the background never touches the store today, and every store write already
lands in one `chrome.storage.local` key. That makes the background the natural sync engine.

## 1. Overview

```
 popup / content script                background (SW on Chrome/Edge, event page on Firefox)
 ┌──────────────────────┐              ┌───────────────────────────────────────────────┐
 │ Zustand + persist    │─ writes ────▶│ storage.onChanged(prompt-vault-storage)       │
 │ (unchanged API)      │  blob        │   diff folders/prompts vs. sync shadow        │
 │                      │◀─ rehydrate ─│   → outbox (persisted) → Firestore Lite       │
 │ "Sign in" button ────┼─ message ───▶│ Auth: identity.launchWebAuthFlow → Firebase   │
 └──────────────────────┘              │ Pull: on sign-in / startup / alarm → LWW apply│
                                       └───────────────────────────────────────────────┘
```

All Firebase code lives in the background bundle only. The popup and content scripts never
import Firebase; they send `auth:signIn` / `auth:signOut` / `auth:status` messages.

## 2. Auth

### Flow (same on Chrome, Edge, Firefox)
1. Popup sends `auth:signIn` to background. (The flow must run in the background: the popup
   closes when the auth window takes focus, which would kill an in-popup flow.)
2. Background calls `identity.launchWebAuthFlow({ interactive: true })` against
   `https://accounts.google.com/o/oauth2/v2/auth` with `response_type=id_token`,
   `scope=openid email profile`, a random `nonce`, and
   `redirect_uri = identity.getRedirectURL()`.
3. Parse `id_token` from the redirect fragment, verify `nonce`.
4. `signInWithCredential(auth, GoogleAuthProvider.credential(idToken))`.
5. Firebase now holds the session and refreshes its own ID token; the Google ID token is discarded.

### Why not the alternatives
| Option | Chrome | Edge | Firefox | Verdict |
|---|---|---|---|---|
| `chrome.identity.getAuthToken` | ✅ | ❌ (needs Chrome profile sign-in) | ❌ | Chrome-only |
| `identity.launchWebAuthFlow` | ✅ | ✅ | ✅ (`browser.identity`) | **Use this** |
| Firebase `signInWithPopup` in SW | ❌ no DOM/window | ❌ | ❌ | Not possible |
| Offscreen doc + hosted iframe (Firebase's documented extension recipe) | ✅ | ✅ | ❌ no `offscreen` API | Chromium-only fallback |
| Open a tab to a hosted sign-in page, pass token back via content script | ✅ | ✅ | ✅ | Fallback if launchWebAuthFlow proves flaky |

### MV3 CSP / SDK constraints
- **Version:** `firebase@12.19.0` (v10+ is the floor for the `firebase/auth/web-extension` entry).
  Background bundle: 156 kB raw / 34 kB gzipped — acceptable for a background-only import.
- **Remote code:** the default `firebase/auth` entry lazy-loads `apis.google.com/js/api.js`
  and reCAPTCHA for popup/phone flows. MV3 forbids remotely hosted code and the extension CSP
  (`script-src 'self'`) blocks it. Import **`firebase/auth/web-extension`**, which strips those
  loaders (and therefore popup/redirect/phone sign-in — we don't need them).
- **Firestore in a SW:** the full `firebase/firestore` SDK relies on WebChannel/XHR streaming and
  optional IndexedDB persistence, which is unreliable in a service worker. Use
  **`firebase/firestore/lite`** — fetch-based REST, no listeners, no offline cache. That matches
  "no real-time listeners" and we already have our own local cache.
- **Verified:** `src/background/firebase.ts` initializes app + auth + Firestore Lite, and
  `tests/background-firebase.test.ts` loads the built background bundle with `window`/`document`
  absent (only `chrome` and `indexedDB` stubbed) and asserts the bundle pulls in no remote script.
  Residual `window.cordova` / `document.cookie` references remain in the bundle but sit in code
  paths the web-extension entry never reaches.
- **No CSP changes needed:** MV3 default CSP doesn't restrict `connect-src`, and the Google
  endpoints are CORS-enabled, so no `host_permissions` are required (avoids Firefox's opt-in
  host permission prompt).

### Manifest changes
- `permissions`: add `identity`, `alarms`.
- `background`: declare both `"service_worker"` and `"scripts"`. Chrome 121+ ignores `scripts`
  when `service_worker` is present; Firefox 121+ ignores `service_worker` when `scripts` is
  present. Alternatively use `vite-plugin-web-extension`'s `{{chrome}}.` / `{{firefox}}.` keys.
- `browser_specific_settings.gecko.id`: required so Firefox's redirect URL is stable.

### Google Cloud / Firebase setup
- One OAuth client of type **Web application**. Register each browser's
  `identity.getRedirectURL()` as an authorized redirect URI:
  Chrome store ID, Edge Add-ons ID (different from Chrome's), Firefox
  (`https://<hash>.extensions.allizom.org/`), plus a pinned dev ID (manifest `key`) for unpacked builds.
- Add that client ID to Firebase Auth → Google provider → "whitelisted client IDs".

## 3. Sync

### Firestore layout
```
users/{uid}                       { schemaVersion, migratedAt }
users/{uid}/prompts/{promptId}    { title, content, folderId, favorited, createdAt, updatedAt, deleted }
users/{uid}/folders/{folderId}    { name, parentId, order, updatedAt, deleted }
```
One doc per item → last-write-wins is per item, and one edit = one small write.

### What syncs
- **Synced:** `folders`, `prompts`.
- **Local-only:** everything else in `partialize` (editor, tabs, panel widths, toggles) and
  `lastUsedAt` (bumped on every insert; syncing it would multiply writes for little value).

### Store changes required (small, in a `version: 7` migration)
- `Folder` gains `updatedAt` (backfill `Date.now()`) and `order` (backfill from array index).
- Every library mutation bumps `updatedAt`: `renameFolder`, `moveFolder`, `togglePromptFavorite`
  (currently don't). `touchPrompt` stays as-is since `lastUsedAt` is local-only.
- Root order must become an explicit `order` field — array position can't be expressed per document.

### Push (sync-on-write)
Background listens to `storage.onChanged` for `prompt-vault-storage`:
1. Parse `newValue`, compare folders/prompts against a **shadow map** `{ [id]: updatedAt }` of
   what Firestore last acknowledged (`chrome.storage.local["prompt-vault-sync-meta"]`).
2. Item with `updatedAt` ≠ shadow → enqueue upsert. Id in shadow but missing locally → enqueue
   tombstone (`deleted: true, updatedAt: now`). Folder cascades fall out naturally: each removed
   prompt is its own tombstone.
3. Outbox (`prompt-vault-outbox`) is keyed by `collection/id`, so repeated edits coalesce.
4. Flush with `writeBatch` (≤500 ops per batch), debounced ~1–2 s. On success update shadow and
   drop entries; on failure keep them.

This needs **zero changes to store actions** beyond the `updatedAt` fixes — the store keeps
writing to local storage exactly as today.

### Pull
"No listeners" still requires *some* pull or a second device never sees changes. Pull runs on:
sign-in, background startup, popup open, and a `chrome.alarms` tick (e.g. every 15 min).
Popup-open is the trigger that matters in practice — it's one cheap query and covers the case
the user actually notices (open the extension on device B after editing on device A); the alarm
is just a backstop for long-open sessions.
1. Flush outbox first.
2. Query `where("updatedAt", ">", lastPulledAt)` on both collections.
3. Per doc: skip if an outbox entry exists for it; else apply if `remote.updatedAt > local.updatedAt`
   (tombstone → remove locally). Update shadow and `lastPulledAt`.
4. Write the merged blob back to `prompt-vault-storage` (preserving local-only fields and
   `version`). Existing `startStorageSync` rehydrates open popups/content scripts.
5. Echo suppression is automatic: pulled items already match the shadow, so the onChanged diff
   enqueues nothing.

### Timestamps
`updatedAt` is client `Date.now()`. Clock skew between devices can make an older edit win.
Acceptable for a personal library; see open questions.

## 4. Migration (first sign-in)

0. **Merge prompt.** If the local library is non-empty after sign-in, it was made while signed out
   (sign-out wipes it, §6). Before registering the push handler or alarm, the popup asks "Merge N
   local prompts into <email>?". **Yes** → continue below. **No** → clear the local library
   (`folders`, `prompts`) first, so the steps below upload nothing and the pull fills it from the
   account.
1. `getDoc(users/{uid})`.
2. **Doc missing** → first sign-in anywhere: batch-write all local folders and prompts (chunked
   at 500), then write `users/{uid}` with `migratedAt`. Populate shadow. Writing the marker last
   makes an interrupted migration simply re-run (writes are idempotent by id).
3. **Doc exists** → account already has data from another device: run a normal pull, then let the
   push diff upload any local-only items. Result is a per-item union with LWW on conflicts.
4. Record `lastSyncedUid` in sync-meta.

Pre-existing ids are `crypto.randomUUID()`, so collisions between devices aren't a concern.

## 5. Security

### Firestore rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
Optional hardening: cap `content` size and require `updatedAt is int` on writes.
The Firebase web `apiKey` in the bundle is an identifier, not a secret — rules are the boundary.
(App Check isn't practical here: reCAPTCHA providers need remote scripts.)

### Token storage
- **Firebase refresh/ID tokens:** leave them in Firebase Auth's own IndexedDB persistence inside the
  background context. That lives in the extension origin and is not reachable by content scripts,
  which run in the host page's origin.
- **Do not** put tokens in `chrome.storage.local`: content scripts get full access to it by default,
  and they run on third-party pages (claude.ai, chatgpt.com, …).
- **Do not** use `chrome.storage.sync` for tokens (replicated to the browser account).
- **Google `id_token`:** used once for `signInWithCredential`, never persisted.
- Popup/content scripts only ever receive `{ signedIn, email }` via messages.

## 6. Fallback (signed out / offline)

- **Signed out:** background doesn't register the onChanged push handler or alarm; the extension
  behaves exactly as today. Local storage is always the source of truth for the UI.
- **Offline / Firestore errors:** writes stay in the outbox; retried on next alarm, next background
  startup, or next local write. `navigator.onLine` is only a hint, not a gate.
- **Sign-out:** the library is already in Firestore, so local data is wiped:
  1. Flush the outbox, and wait until shadow matches local.
  2. If the flush fails (offline, write errors), warn "N unsynced changes will be lost" and require
     confirmation before continuing.
  3. Clear account-scoped storage: `prompt-vault-storage` library data (`folders`, `prompts`) and
     `prompt-vault-sync-meta` / `prompt-vault-outbox` (shadow, `lastPulledAt`, `lastSyncedUid`).
     Keep local-only UI state (editor, tabs, panel widths, toggles).
  4. `signOut()`. The signed-out user starts with an empty library; the next sign-in's pull (§4.3)
     restores that account's data, and §4.2 uploads nothing for a brand-new account.
- **SW termination:** all sync state (outbox, shadow, `lastPulledAt`) is in `chrome.storage.local`,
  so an evicted worker resumes cleanly.
- UI shows a small status: local-only / synced / pending (N) / error.

## 7. Tradeoffs & open questions

1. **Implicit `id_token` flow.** Google discourages implicit grants, but auth-code + PKCE for a
   "Web application" client still requires a client secret at token exchange, which can't ship in an
   extension. Implicit is the pragmatic option; the hosted-page fallback is the escape hatch if Google
   tightens this.
2. **Account switching (resolved: wipe on sign-out §6, and a merge prompt on sign-in §4.0).**
   Without these, if user A signs out and user B signs in on the same browser, step 4.3 would upload
   A's local library into B's account. With the wipe, the only local data at sign-in is what was
   made while signed out, and the user chooses whether to merge it into the account or discard it.
   Tradeoff: after a sign-out, the user starts from an empty library.
3. **Clock skew.** Could use `serverTimestamp()` for ordering, but then local LWW comparisons need
   the server value echoed back. Recommend deferring unless it bites.
4. **Race with open UIs.** An open popup holding stale in-memory state can overwrite a just-pulled
   blob before `rehydrate` lands. Window is small; revisit if reports appear.
5. **Blob coupling.** The background reads/writes the persist blob format (`{ state, version }`)
   directly, so future store migrations must be mirrored or the background must refuse to write
   when `version` doesn't match.
6. **Tombstone growth.** Deleted docs accumulate forever. Negligible for text prompts; a periodic
   purge of tombstones older than N days is possible later.
