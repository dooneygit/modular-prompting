import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Prompt {
  id: string;
  text: string;
  createdAt: number;
}

interface PromptStore {
  prompts: Prompt[];
  addPrompt: (text: string) => void;
  removePrompt: (id: string) => void;
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      addPrompt: (text) =>
        set((state) => ({
          prompts: [
            ...state.prompts,
            { id: crypto.randomUUID(), text, createdAt: Date.now() },
          ],
        })),
      removePrompt: (id) =>
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        })),
    }),
    { name: "prompt-vault-storage" }
  )
);
