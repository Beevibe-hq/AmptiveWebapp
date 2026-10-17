import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search, Users } from 'lucide-react';
import type { Community } from '@/lib/api/communities';

/*
 * Community combobox for Create Event.
 *
 * The old menu rendered every community at full height (28 and counting ran off the screen),
 * had no search, no keyboard support and no tick on the chosen one. This one searches as you
 * type, scrolls inside a fixed height, sorts A–Z, shows member counts to tell similar names
 * apart, and works with arrows / Enter / Esc and screen readers.
 */

interface CommunityPickerProps {
  communities: Community[];
  value: string | null | undefined;
  onChange: (communityId: string) => void;
  loading?: boolean;
}

const formatMembers = (count?: number) => {
  if (!count || count < 1) return null;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}m members`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}k members`;
  return `${count} member${count === 1 ? '' : 's'}`;
};

function CommunityAvatar({ community, size = 'md' }: { community?: Community; size?: 'sm' | 'md' }) {
  const image = community?.image || community?.cover_image;
  const box = size === 'sm' ? 'h-8 w-8 rounded-xl' : 'h-9 w-9 rounded-lg';
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center overflow-hidden bg-gray-100 text-gray-400`}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Users className="h-4 w-4" />}
    </span>
  );
}

export function CommunityPicker({ communities, value, onChange, loading = false }: CommunityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = communities.find(community => community.community_id === value);

  const sorted = useMemo(
    () => [...communities].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    [communities]
  );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return sorted;
    return sorted.filter(community =>
      community.name.toLowerCase().includes(term) || (community.description || '').toLowerCase().includes(term)
    );
  }, [sorted, query]);

  const close = (refocus = true) => {
    setOpen(false);
    setQuery('');
    if (refocus) triggerRef.current?.focus();
  };

  const choose = (community: Community) => {
    onChange(community.community_id);
    close();
  };

  // Opening: focus the search box and start on the current choice, so Enter keeps it.
  useEffect(() => {
    if (!open) return;
    const current = results.findIndex(community => community.community_id === value);
    setActiveIndex(current >= 0 ? current : 0);
    requestAnimationFrame(() => searchRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Typing narrows the list; start again from the top match.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (results[activeIndex]) choose(results[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        disabled={loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-black/5 px-3.5 py-3 text-left text-sm font-medium text-gray-900 shadow-sm transition-all duration-200 hover:bg-black/[0.07] focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <CommunityAvatar community={selected} size="sm" />
          <span className="min-w-0">
            <span className={`block truncate ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
              {loading ? 'Loading communities…' : selected?.name || 'Select a community'}
            </span>
            {selected && formatMembers(selected.member_count) && (
              <span className="block truncate text-xs font-normal text-gray-500">{formatMembers(selected.member_count)}</span>
            )}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl shadow-black/10 animate-in fade-in zoom-in-95 duration-150">
          <div className="border-b border-black/5 p-2">
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Search ${communities.length} communities`}
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
                aria-autocomplete="list"
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>

          <ul ref={listRef} id={listId} role="listbox" aria-label="Communities" className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-500">
                {communities.length === 0 ? 'No communities available' : <>No communities match “{query.trim()}”</>}
              </li>
            ) : (
              results.map((community, index) => {
                const isSelected = community.community_id === value;
                const isActive = index === activeIndex;
                const meta = formatMembers(community.member_count) || community.description || null;
                return (
                  <li
                    key={community.community_id}
                    id={optionId(index)}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(community)}
                    // No colour transition: the highlight should track the arrow keys instantly.
                    className={`flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 ${isActive ? 'bg-gray-100' : ''}`}
                  >
                    <CommunityAvatar community={community} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-gray-900'}`}>
                        {community.name}
                      </span>
                      {meta && <span className="block truncate text-xs text-gray-500">{meta}</span>}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
