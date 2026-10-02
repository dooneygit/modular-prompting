# Implementation Plan: Auth + Cloud Sync

Implements `ARCHITECTURE.md`. Section refs like §4.0 point to that doc. Steps run in order, and
each one leaves the extension buildable and usable while signed out.

## 1. Conventions

- **Verify every step with:** `npx tsc --noEmit`, `npm run build`, `npm test` (from Step 3 on),
  plus the step's own manual check. Load the extension unpacked from `dist/`.
- **Firebase stays in the background.** Only files under `src/background/` import `firebase/*`.
  The popup and content scripts only send messages. Check with `grep -l firebase dist/**/*.js`,
  which should list background output only.
- **Message protocol** (popup → background): `auth:signIn`, `auth:signOut`, `auth:status`, plus
  `sync:pull` and `sync:merge`. The last two are needed by §3 Pull and §4.0 but aren't named in §1.
- **New storage keys:** `prompt-vault-sync-meta` (shadow, `lastPulledAt`, `lastSyncedUid`,
  `pendingMerge`, `lastError`) and `prompt-vault-outbox`.

## 2. MV3 constraints and where ARCHITECTURE.md conflicts with them

| # | Constraint | Impact / conflict |
|---|---|---|
| 1 | SW event listeners must be registered synchronously at top level, or events won't wake the worker. | **Conflicts with §6** ("doesn't register the onChanged push handler or alarm" when signed out). Instead, always register `storage.onChanged` and `alarms.onAlarm` at top level and check auth state inside the handler. Only the alarm itself is created or cleared on sign-in/out. |
| 2 | Top-level SW code runs on *every* wake (each message, each storage change). | "Pull on background startup" (§3), read literally, means pulling after almost every edit. Plan uses `runtime.onStartup` + `onInstalled` instead. See §7 Q6. |
| 3 | The SW is killed after ~30 s idle. Timers don't survive that. | A debounced flush (`setTimeout`) can be lost. That's fine because the outbox is persisted (§6). Any wake (write, alarm, popup open) flushes it. Flushes must be serialized (one in-flight promise). |
| 4 | Dynamic `import()` is not allowed in service workers. | Check that built background output contains no `import(` and Vite didn't split Firebase into lazily loaded chunks. Add this to the Step 3 test. |
| 5 | No remotely hosted code; CSP `script-src 'self'`. | Matches §2: use `firebase/auth/web-extension` and `firebase/firestore/lite` only. Verify `dist/` has no `apis.google.com/js` or `recaptcha` loaders. No CSP or `host_permissions` changes. |
| 6 | The popup closes when the auth window takes focus. | §2 handles this for the flow itself. **But it breaks §4.0**: "the popup asks" to merge right after sign-in, and that popup is usually gone by then. The plan persists `pendingMerge` and shows the prompt on the next popup open (Step 11). The background must also finish sign-in even when nothing receives `sendResponse`. |
| 7 | One extension event or request can run for at most ~5 min. | A user who leaves the Google window open longer may lose the flow. Accept this and surface a retryable error. |
| 8 | The current build is Chrome-only: one manifest with `service_worker` + `type: module`. | §2 targets Chrome, Edge, and Firefox. Dual `service_worker`/`scripts` keys and `gecko.id` need build validation (Step 2). See §7 Q2. |
| 9 | Manifest `key` pins the dev ID but must not ship to stores. Store IDs differ per store. | Redirect URIs for store builds can only be registered after the listings exist (§7 Q11). |

## 3. Security considerations

- **Tokens:** Firebase keeps its tokens in its own IndexedDB, in the extension origin. Never copy
  them into `chrome.storage.*`, never log them, and never send them over messages. The Google
  `id_token` exists only inside the sign-in function. Popup and content scripts receive
  `{ signedIn, email, pendingMerge? }` and nothing more.
- **Nonce:** decode the `id_token` payload and reject it unless `nonce` matches. Firebase checks
  the signature and audience server-side in `signInWithCredential`.
- **Message senders:** handle `auth:*` and `sync:*` only when
  `sender.url?.startsWith(chrome.runtime.getURL(""))`, i.e. from the popup or fullscreen tab.
  A content script, which runs on a third-party page, must not be able to trigger sign-out,
  which wipes the library.
- **Per-user scoping:** build every Firestore path from `auth.currentUser.uid` at write time.
  Abort a flush or pull if `uid !== lastSyncedUid`. This stops one account's outbox from being
  written into another account.
- **Firestore rules:** use the §5 rules as written. Test them in the Rules Playground:
  unauthenticated reads/writes are denied, and `uid` ≠ path uid is denied.
- **`chrome.storage.local`** holds the library and sync metadata. Content scripts can read it,
  same as today. It contains no secrets.
- **`apiKey`** in the bundle via `import.meta.env` is not a secret (§5).

## 4. Phase A: Setup and auth

### Step 1: Firebase project and Firestore rules (mostly manual)
- **Goal:** a Firebase project with Google Auth, Firestore, and deployed rules. Local env configured.
- **Files:** `.env.example` (new; README references it), `src/vite-env.d.ts` (type `ImportMetaEnv`),
  `firestore.rules` (new; the §5 rules, kept for review even if deployed through the console).
- **Notes:** enable the Google provider and create Firestore in Native mode. Env vars are the four
  README lists plus `VITE_GOOGLE_OAUTH_CLIENT_ID` (missing from README). The OAuth client itself
  is created in Step 2 because it needs the extension IDs.
- **Done when:** rules are deployed, Playground denies cross-uid access, `.env` is filled, and `tsc` passes.

### Step 2: Manifest, stable IDs, and OAuth client
- **Goal:** the manifest from §2 "Manifest changes", plus a registered redirect URI.
- **Files:** `manifest.json`, possibly `vite.config.ts`.
- **Notes:** add `identity` and `alarms` permissions, a `key` (pinned dev ID), and
  `browser_specific_settings.gecko.id`. Use `background.service_worker` + `scripts`, or the
  plugin's `{{chrome}}.`/`{{firefox}}.` keys if `vite-plugin-web-extension` rejects having both.
  Then create the **Web application** OAuth client, add the dev redirect URI
  (`chrome.identity.getRedirectURL()`), and whitelist the client ID in Firebase (§2 "Google Cloud").
- **Done when:** the build loads unpacked with the pinned ID, the SW console prints the expected
  redirect URL, and the OAuth client lists it. If Firefox is in scope, it loads via `about:debugging`.

### Step 3: Firebase init module and test harness
- **Goal:** the background initializes app, auth, and Firestore Lite without remote code.
- **Files:** `package.json` (add `vitest` and a `test` script; README already documents them),
  `src/background/firebase.ts` (new), `tests/background-firebase.test.ts` (new).
- **Notes:** these are the files §2 "Verified" describes, but they aren't in the repo (§7 Q1).
  Import only `firebase/app`, `firebase/auth/web-extension`, and `firebase/firestore/lite`.
  The test loads the built background bundle with `window`/`document` absent, then asserts there
  is no remote script URL and no dynamic `import(` (§2 row 4).
- **Done when:** `npm test` passes, and `dist/` background output passes the grep checks in §1 and §2.

### Step 4: Sign-in flow (background)
- **Goal:** `auth:signIn` produces a Firebase session. `auth:status` reports it.
- **Files:** `src/background/auth.ts` (new), `src/background/index.ts`.
- **Notes:** follow §2 Flow steps 1–5. Generate the nonce with `crypto.randomUUID()` and parse
  `id_token` from the redirect URL fragment. `auth:status` awaits `auth.authStateReady()` first.
  Keep the existing `return true` async-response pattern and add the sender check (§3).
  A closed or cancelled auth window returns `{ error }` and never throws unhandled.
- **Done when:** sending `auth:signIn` from the popup's devtools console opens Google, the user
  appears in Firebase Console → Users, and `auth:status` returns the email.

### Step 5: Session persistence across SW lifecycle
- **Goal:** auth survives SW termination and browser restart. Later steps get a reliable gate.
- **Files:** `src/background/auth.ts`.
- **Notes:** export a `getSignedInUid()` that awaits `authStateReady()`. Every sync handler gates
  on it (§2 row 1). Don't base lifecycle decisions on `onAuthStateChanged` callbacks alone.
- **Done when:** after stopping the SW in `chrome://serviceworker-internals` and after a full
  browser restart, `auth:status` still returns the email without any interaction.

### Step 6: Popup account UI
- **Goal:** Sign in / signed-in email / Sign out entry point in the popup.
- **Files:** one new component in `src/popup/components/`, mounted in `TopNavBar.tsx` or
  `SideNavBar.tsx`, styled per `DESIGN.md`.
- **Notes:** query `auth:status` on mount, since the popup is usually reopened after auth.
  The Sign out button is wired in Step 12.
- **Done when:** clicking Sign in, then reopening the popup, shows the email, and the popup
  bundle contains no Firebase code.

## 5. Phase B: Sync

### Step 7: Store `version: 7` migration
- **Goal:** the §3 "Store changes required".
- **Files:** `src/store/promptStore.ts`, `src/store/chromeStorage.ts` (export a `STORE_VERSION`
  constant so the background can guard on it without importing the store), `tests/promptStore.test.ts`.
- **Notes:** `Folder` gets `updatedAt` and `order`, backfilled. `addFolder` sets both.
  `renameFolder`, `moveFolder`, and `togglePromptFavorite` bump `updatedAt`. `moveFolder` rewrites
  `order` for reordered siblings (see §7 Q4). Array order stays the local source of truth;
  `order` mirrors it. Test via `useAppStore.persist.getOptions().migrate` with a `chrome.storage` stub.
- **Done when:** tests cover the v6→v7 backfill and each `updatedAt` bump, and an existing v6
  library loads unchanged in the unpacked build.

### Step 8: Diff and sync-meta (pure logic)
- **Goal:** compute outbox entries from blob + shadow.
- **Files:** `src/background/sync.ts` (new), `tests/sync.test.ts`.
- **Notes:** implements §3 Push steps 1–3. Exclude `lastUsedAt` from synced docs. Refuse to
  process a blob whose `version !== STORE_VERSION` (§7.5 of the architecture doc) and record
  `lastError`.
- **Done when:** unit tests cover upsert, tombstone, folder cascade, coalescing, a
  `lastUsedAt`-only change producing nothing, and the version mismatch.

### Step 9: Push (outbox → Firestore)
- **Goal:** local edits reach Firestore.
- **Files:** `src/background/sync.ts`, `src/background/index.ts`.
- **Notes:** top-level `storage.onChanged` listener, gated on signed-in. Step 11 tightens this to
  `lastSyncedUid === uid`. Debounce about 1.5 s, use `writeBatch` with ≤500 ops, and serialize
  flushes. On success, update the shadow only for entries whose `updatedAt` still matches what was
  sent, so an edit made mid-flight isn't dropped. On failure, keep the entry and set `lastError`.
- **Done when:** a popup edit appears in the Firestore console within about 2 s, a delete writes
  a tombstone, and with the SW set offline the outbox persists and then drains after reconnecting
  and making the next edit.

### Step 10: Pull
- **Goal:** remote changes reach local storage and open UIs.
- **Files:** `src/background/sync.ts`, `src/background/index.ts`, `src/popup/main.tsx`
  (send `sync:pull` on boot).
- **Notes:** implements §3 Pull steps 1–5. Triggers are sign-in, `onStartup`/`onInstalled`,
  `sync:pull`, and a 15-min alarm created while signed in. Read the blob again right before
  writing it back. Preserve local `lastUsedAt` and all local-only fields. Sort folders by `order`
  when applying. When applying a remote tombstone, also remove that id from the shadow.
- **Done when:** merge logic is unit-tested (LWW, outbox-pending skip, tombstone). Manually, with
  two Chrome profiles on one account: an edit or delete on A shows up on B when B's popup opens.

### Step 11: First sign-in migration and merge prompt
- **Goal:** §4 steps 0–4.
- **Files:** `src/background/sync.ts`, `src/background/auth.ts`, a merge dialog in
  `src/popup/components/` (follow the existing `Delete*Modal` pattern), and the account component.
- **Notes:** after sign-in, if `lastSyncedUid` is unset and the local library is non-empty,
  persist `pendingMerge: { uid, count }` and keep push/pull gated. `auth:status` returns it, and
  the popup shows "Merge N local prompts into <email>?" and replies with `sync:merge { accept }`.
  If the library is empty, skip the prompt. Write the `users/{uid}` marker last (§4.2).
  Switch the push gate to `lastSyncedUid === uid`.
- **Done when:** (a) new account, Yes: everything is uploaded and `migratedAt` is set.
  (b) No: local is cleared and the account's data is pulled. (c) Existing account on a second
  device: per-item union. (d) Re-running after an interrupted migration duplicates nothing.

## 6. Phase C: Sign-out and edge cases

### Step 12: Sign-out
- **Goal:** §6 sign-out steps 1–4.
- **Files:** `src/background/auth.ts`, `src/background/sync.ts`, the account component.
- **Notes:** **Ordering hazard not covered by §6:** writing the wiped blob fires `onChanged`,
  and while sync is still active the diff would tombstone the whole library in Firestore.
  Sequence: await the in-flight flush, then flush again. If the outbox is non-empty, return
  `{ unsynced: N }`, and the popup confirms and resends with `force`. Then clear the alarm, clear
  sync-meta and outbox (which closes the gate), write the blob with empty `folders`/`prompts`,
  and finally call `signOut()`.
- **Done when:** sign-out empties the library and keeps UI state, the Firestore console shows
  **no new tombstones**, signing back in restores the library, and signing out while offline
  shows the N-unsynced warning.

### Step 13: Sync status indicator
- **Goal:** the §6 status line: local-only / synced / pending (N) / error.
- **Files:** the account component.
- **Notes:** the popup reads outbox size and `lastError` straight from `chrome.storage.local`
  (no secrets there) and updates on `storage.onChanged`. No new message type is needed.
- **Done when:** each state appears by toggling sign-in, going offline with pending edits,
  reconnecting, and forcing an error (e.g. temporarily breaking the rules).

## 7. Open questions and gaps in ARCHITECTURE.md

1. **Doc vs. repo mismatch.** §2 "Verified" cites `src/background/firebase.ts` and
   `tests/background-firebase.test.ts`. Neither exists. README documents `npm test` (Vitest) and
   `.env.example`, which don't exist either. The plan treats them as unbuilt (Steps 1, 3).
   Is adding Vitest acceptable?
2. **Browser scope.** Are Firefox and Edge required for this milestone? No Firefox build exists
   today. Going Chrome-only first would simplify Step 2 and drop the gecko/`scripts` validation.
3. **Clock skew breaks pull, not just LWW.** §3 queries `updatedAt > lastPulledAt` using client
   clocks, and doesn't say whether `lastPulledAt` is the local time or the max remote `updatedAt`
   seen. Either way, a device whose clock runs behind writes docs that other devices *never* pull.
   That's worse than §7.3 of the architecture doc describes. A cheap fix: add a
   `syncedAt: serverTimestamp()` field and use it only as the pull cursor, keeping LWW on
   `updatedAt`. Needs a decision before Step 10.
4. **Folder ordering.** `order` is backfilled from array index, so moving one root folder shifts
   its siblings' indices. Each shifted sibling then needs an `updatedAt` bump (N writes per drag),
   or `order` needs to be a fractional key. Child-folder order is also array order today, and §3
   doesn't cover it. Decide before Step 7.
5. **Merge prompt timing** (§2 row 6). While `pendingMerge` is unresolved, should local edits
   still be allowed? The plan says yes, and they're included in or discarded with the merge.
   The in-page panel can't show the prompt, only the popup can.
6. **"Background startup" pull trigger.** Does it mean `runtime.onStartup` (plan's assumption)
   or every SW wake?
7. **Account picker.** After sign-out, Google may silently reuse the last account. Add
   `prompt=select_account` to the auth URL so the account switching described in §7.2 of the
   architecture doc actually works?
8. **Tabs after wipe.** Tabs whose `viewId` is a wiped folder will show "Unknown"
   (`TopNavBar.tsx` label fallback). Reset them to `"all"` during sign-out, the way `deleteFolder`
   does?
9. **Env var.** The OAuth client ID isn't in README's required env list.
10. **Rules.** Include the §5 "optional hardening" (content size cap, `updatedAt is int`)?
    Deploy through the console or the Firebase CLI (`firebase.json`)? §5 doesn't say.
11. **Store builds.** How are dev and store manifests produced? `key` must be stripped, and the
    Edge and Chrome IDs differ. Store redirect URIs can only be registered after the listings exist.
12. **Status scope.** Popup only (plan's assumption), or the in-page panel too?
13. **Store compliance.** Syncing user data to a server requires a privacy policy and data
    disclosure on the Chrome Web Store, Edge, and AMO. This isn't mentioned anywhere.
14. **Version-mismatch UX** (§7.5 of the architecture doc). When the background refuses a blob,
    is `lastError` in the status line enough?
