import type { AppData } from './types';

export function columnsShown(data: AppData): boolean {
  if (data.meta.columnsOpen !== null) {
    return data.meta.columnsOpen;
  }

  return data.items.some((item) => item.kind !== 'quick');
}

export function setColumnsOpen(data: AppData, open: boolean): AppData {
  return { ...data, meta: { ...data.meta, columnsOpen: open } };
}
