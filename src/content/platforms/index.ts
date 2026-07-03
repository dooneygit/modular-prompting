import type { PlatformAdapter } from "./types";
import { claudeAdapter } from "./claude";
import { chatgptAdapter } from "./chatgpt";
import { perplexityAdapter } from "./perplexity";
import { copilotAdapter } from "./copilot";

const adapters: PlatformAdapter[] = [
  claudeAdapter,
  chatgptAdapter,
  perplexityAdapter,
  copilotAdapter,
];

export function getAdapterForCurrentSite(): PlatformAdapter | null {
  const url = window.location.href;
  return adapters.find((adapter) => adapter.matches(url)) ?? null;
}

export type { PlatformAdapter } from "./types";
