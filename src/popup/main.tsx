import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useAppStore } from "../store/promptStore";
import { migrateLocalStorage } from "../store/chromeStorage";
import { startStorageSync } from "../store/sync";

async function boot() {
  await migrateLocalStorage();
  await useAppStore.persist.rehydrate();
  startStorageSync();

  const root = document.getElementById("root")!;
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot();
