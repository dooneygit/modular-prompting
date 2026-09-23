# Modular Prompting

A browser extension that works as a personal prompt component library. Save reusable prompt
fragments in a folder-based library, then drag them into an editor to compose, reorder, and
assemble full prompts from smaller, interchangeable parts.

Works on Chrome, Edge, and Firefox (Manifest V3).

## Features

- **Folder library** — organize prompt fragments into nested folders; favorite the ones you use most.
- **Drag-and-drop composer** — drop fragments into the editor and reorder them to build a prompt.
- **Local-first** — the library lives in extension storage and works fully offline or signed out.
- **Cloud sync (optional)** — sign in with Google to sync your library across devices.

## Cloud sync with Google + Firebase

Sign in from the popup with your Google account to back up and sync folders and prompts via
Firebase Auth and Firestore.

- **Sign-in** uses `identity.launchWebAuthFlow` to get a Google ID token, exchanged for a Firebase
  session in the background script. Works the same across Chrome, Edge, and Firefox.
- **What syncs:** folders and prompts. Editor state, tabs, and layout stay local.
- **How:** edits are queued in a persisted outbox and pushed to Firestore in batches; changes from
  other devices are pulled on sign-in, popup open, and a periodic alarm. Conflicts resolve
  last-write-wins per item.
- **First sign-in:** existing local prompts can be merged into your account.
- **Sign-out:** pending changes are flushed, then the local library is cleared (it remains in your account).
- **Privacy:** each user can only read and write `users/{uid}/…`, enforced by Firestore rules.
  Auth tokens stay in the background context and are never exposed to content scripts.

## Development

```sh
npm install
cp .env.example .env   # fill in your Firebase config
npm run dev            # build in watch mode to dist/
npm run build          # production build
npm test               # run tests (Vitest)
```

Required environment variables:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
```

Load the extension unpacked from `dist/` via your browser's extensions page.

Built with React, Zustand, dnd-kit, Tailwind, Vite, and Firebase.
