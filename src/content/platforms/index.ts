import type { PlatformAdapter } from "./types";
import { claudeAdapter } from "./claude";

const adapters: PlatformAdapter[] = [claudeAdapter];

export function getAdapterForCurrentSite(): PlatformAdapter | null {
  const url = window.location.href;
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export type { PlatformAdapter } from "./types";
