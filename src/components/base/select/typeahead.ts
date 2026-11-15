const collator = new Intl.Collator(undefined, { sensitivity: 'base' });

export interface TypeaheadItem {
  label: string;
  disabled?: boolean;
}

/**
 * Returns the index of the next enabled item whose label starts with `query`,
 * or null. A single letter, or one letter typed repeatedly, moves past `from`
 * so it cycles through matches. A longer query can stay on the current item.
 * Pass -1 as `from` to search from the start.
 */
export function findTypeaheadMatch(
  items: TypeaheadItem[],
  from: number,
  query: string
): number | null {
  const repeated = [...query].every((character) => character === query[0]);
  const search = repeated ? query[0] : query;
  const start = from < 0 ? 0 : from + (search.length === 1 ? 1 : 0);

  for (let step = 0; step < items.length; step += 1) {
    const index = (start + step) % items.length;
    const item = items[index];
    if (!item.disabled && startsWith(item.label, search)) {
      return index;
    }
  }
  return null;
}

function startsWith(label: string, search: string): boolean {
  return collator.compare(label.slice(0, search.length), search) === 0;
}
