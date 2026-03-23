import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  commands: CommandItem[];
  onClose: () => void;
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return commands;

    return commands.filter((command) => {
      const haystack = [command.label, command.hint, ...(command.keywords ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [commands, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages and actions..."
            className="w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
            aria-label="Search commands"
          />
          <span className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-500">
            ESC
          </span>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-500">No command found.</p>
          ) : (
            filtered.map((command) => (
              <button
                key={command.id}
                type="button"
                onClick={command.onSelect}
                className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900">{command.label}</p>
                {command.hint && <p className="text-xs text-gray-500 mt-0.5">{command.hint}</p>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
