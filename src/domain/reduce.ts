import type { AppData, DayKey, TimerStyle } from './types';
import { dropSkipsWithActivity, skipDay } from './activity';
import { pauseRun, resetClock, settleRun, startItem } from './clock';
import {
  addItem,
  deleteItem,
  markDone,
  reorder,
  setTodayCount,
  tapItem,
  updateItem,
  type ItemInput,
  type ItemSection,
} from './items';
import { mergeData, replaceData } from './backup';
import { setColumnsOpen } from './layout';
import { updateSettings, type SettingsPatch } from './settings';
import { newQuickSession, renameQuick, saveQuickAsTask, setQuickStyle } from './quick-sessions';

export type Action =
  | { type: 'restore'; snapshot: AppData }
  | { type: 'start'; itemId: string }
  | { type: 'pause' }
  | { type: 'reset'; itemId: string }
  | { type: 'settle' }
  | { type: 'addItem'; item: ItemInput }
  | { type: 'updateItem'; itemId: string; item: ItemInput }
  | { type: 'reorder'; section: ItemSection; ids: string[] }
  | { type: 'deleteItem'; itemId: string }
  | { type: 'tapItem'; itemId: string }
  | { type: 'markDone'; itemId: string }
  | { type: 'setTodayCount'; itemId: string; count: number }
  | { type: 'newQuickSession'; start: boolean; name?: string }
  | { type: 'renameQuick'; itemId: string; name: string }
  | { type: 'setQuickStyle'; itemId: string; style: TimerStyle }
  | { type: 'saveQuickAsTask'; itemId: string }
  | { type: 'setColumnsOpen'; open: boolean }
  | { type: 'updateSettings'; patch: SettingsPatch }
  | { type: 'useSkip'; day: DayKey }
  | { type: 'markExported' }
  | { type: 'importData'; mode: 'merge' | 'replace'; incoming: AppData }
  | { type: 'dismissBackupBanner' }
  | { type: 'dismissAutoStop' };

function apply(data: AppData, action: Action, now: number): AppData {
  switch (action.type) {
    case 'restore':
      return action.snapshot;
    case 'start':
      return startItem(data, action.itemId, now);
    case 'pause':
      return data.run === null ? data : { ...pauseRun(data, now), cardItemId: data.run.itemId };
    case 'reset':
      return resetClock(data, action.itemId, now);
    case 'settle':
      return settleRun(data, now);
    case 'addItem':
      return addItem(data, action.item, now);
    case 'updateItem':
      return updateItem(data, action.itemId, action.item, now);
    case 'reorder':
      return reorder(data, action.section, action.ids);
    case 'deleteItem':
      return deleteItem(data, action.itemId, now);
    case 'tapItem':
      return tapItem(data, action.itemId, now);
    case 'markDone':
      return markDone(data, action.itemId, now);
    case 'setTodayCount':
      return setTodayCount(data, action.itemId, action.count, now);
    case 'newQuickSession':
      return newQuickSession(data, { start: action.start, name: action.name }, now);
    case 'renameQuick':
      return renameQuick(data, action.itemId, action.name, now);
    case 'setQuickStyle':
      return setQuickStyle(data, action.itemId, action.style, now);
    case 'saveQuickAsTask':
      return saveQuickAsTask(data, action.itemId, now);
    case 'updateSettings':
      return updateSettings(data, action.patch, now);
    case 'useSkip':
      return skipDay(data, action.day, now);
    case 'markExported':
      return { ...data, meta: { ...data.meta, lastExportAt: now } };
    case 'importData':
      return action.mode === 'merge'
        ? mergeData(data, action.incoming, now)
        : replaceData(data, action.incoming, now);
    case 'dismissBackupBanner':
      return { ...data, meta: { ...data.meta, bannerDismissedAt: now } };
    case 'dismissAutoStop':
      return { ...data, meta: { ...data.meta, autoStop: null } };
    case 'setColumnsOpen':
      return setColumnsOpen(data, action.open);
  }
}

export function reduce(data: AppData, action: Action, now: number): AppData {
  const next = apply(data, action, now);
  return action.type === 'restore' ? next : dropSkipsWithActivity(next);
}
