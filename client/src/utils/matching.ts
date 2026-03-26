import Fuse from 'fuse.js';
import type { ListItem } from '../types';

let fuse: Fuse<ListItem> | null = null;

export function initMatcher(items: ListItem[]) {
  fuse = new Fuse(items, {
    keys: ['value', 'hint'],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

export function findMatch(
  guess: string,
  _items: ListItem[],
  revealedRanks: Set<number>
): ListItem | null {
  if (!fuse || guess.trim().length < 2) return null;

  const results = fuse.search(guess);

  for (const result of results) {
    if (!revealedRanks.has(result.item.rank)) return result.item;
  }

  return null;
}

export function searchItems(
  query: string,
  revealedRanks: Set<number>,
  limit = 6
): ListItem[] {
  if (!fuse || query.trim().length < 1) return [];

  return fuse
    .search(query)
    .filter((r) => !revealedRanks.has(r.item.rank))
    .slice(0, limit)
    .map((r) => r.item);
}
