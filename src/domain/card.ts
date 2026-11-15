import { settleRun } from './clock';
import { isDoneOn } from './items';
import type { AppData, DayKey, Item } from './types';

export function cardItem(data: AppData, day: DayKey, now: number): Item | null {
  if (data.run !== null) {
    return data.items.find((item) => item.id === data.run?.itemId) ?? null;
  }

  const pinnedItem = data.items.find((item) => item.id === data.cardItemId);
  if (pinnedItem?.completion === 'time' && !isDoneOn(data, pinnedItem, day, now)) {
    return pinnedItem;
  }

  return null;
}

export function openApp(data: AppData, now: number): AppData {
  const settled = settleRun(data, now);
  const pinnedItem = settled.items.find((item) => item.id === settled.cardItemId);
  if (pinnedItem?.kind === 'quick' || settled.cardItemId === null) {
    return settled;
  }
  return { ...settled, cardItemId: null };
}
