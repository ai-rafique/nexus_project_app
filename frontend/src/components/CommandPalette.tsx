import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, ClipboardList, TestTube, Loader2 } from 'lucide-react';
import { searchApi, SearchResult, SearchResultType } from '@/api/search';
import { cn } from '@/lib/utils';

const TYPE_ICON: Record<SearchResultType, React.ComponentType<{ className?: string }>> = {
  requirement: ClipboardList,
  document:    FileText,
  test:        TestTube,
};

const TYPE_COLOR: Record<SearchResultType, string> = {
  requirement: 'text-blue-500',
  document:    'text-purple-500',
  test:        'text-green-500',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<SearchResult[]>([]);
  const [loading, setLoading]     = useState(false);
  const [active, setActive]       = useState(0);
  const inputRef                  = useRef<HTMLInputElement>(null);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchApi.search(query);
        setResults(r);
        setActive(0);
      } finally {
        setLoading(false);
      }
    }, 250);
  }, [query]);

  function go(url: string) {
    navigate(url);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && results[active]) go(results[active].url);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          {loading ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" /> : <Search className="h-4 w-4 text-muted-foreground shrink-0" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search requirements, documents, tests…"
            className="flex-1 outline-none text-sm bg-transparent placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex text-xs text-muted-foreground border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="py-1 max-h-80 overflow-y-auto">
            {results.map((r, i) => {
              const Icon = TYPE_ICON[r.type];
              return (
                <li
                  key={r.id}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.url)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer',
                    i === active ? 'bg-muted' : 'hover:bg-muted/50',
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', TYPE_COLOR[r.type])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">
                    {r.type}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No results for "{query}"</p>
        )}

        {!query && (
          <p className="text-xs text-muted-foreground text-center py-6">
            Type to search across requirements, documents, and tests.
          </p>
        )}
      </div>
    </div>
  );
}
