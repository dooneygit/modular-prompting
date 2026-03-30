import { usePromptStore } from "../store/promptStore";

export default function App() {
  const { prompts, addPrompt, removePrompt } = usePromptStore();

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-80 min-h-40 p-4 bg-white">
      <h1 className="text-lg font-semibold text-gray-800 mb-4">Prompt Vault</h1>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            "prompt"
          ) as HTMLInputElement;
          const value = input.value.trim();
          if (value) {
            addPrompt(value);
            input.value = "";
          }
        }}
      >
        <input
          name="prompt"
          type="text"
          placeholder="Add a prompt..."
          className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          Add
        </button>
      </form>

      {prompts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center">No prompts saved yet.</p>
      ) : (
        <ul className="space-y-2">
          {prompts.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-2 rounded border border-gray-200 p-2"
            >
              <span className="flex-1 text-sm text-gray-700 break-words">{p.text}</span>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleCopy(p.text)}
                  className="text-xs text-blue-500 hover:text-blue-700"
                  title="Copy"
                >
                  Copy
                </button>
                <button
                  onClick={() => removePrompt(p.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                  title="Delete"
                >
                  Del
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
