import { dropSkipsWithActivity } from './activity';
import { dayKeyOf } from './days';
import type { AppData, Settings } from './types';

export type SettingsPatch = Partial<Pick<Settings, 'dayStartHour' | 'weekStart' | 'skipsPerMonth'>>;

const MAX_DAY_START_HOUR = 6;

export const MAX_SKIPS_PER_MONTH = 10;

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function updateSettings(data: AppData, patch: SettingsPatch, now: number): AppData {
  const settings: Settings = { ...data.settings, updatedAt: now };
  if (patch.dayStartHour !== undefined) {
    settings.dayStartHour = clampInteger(patch.dayStartHour, 0, MAX_DAY_START_HOUR);
  }
  if (patch.weekStart !== undefined) {
    settings.weekStart = patch.weekStart;
  }
  if (patch.skipsPerMonth !== undefined) {
    settings.skipsPerMonth = clampInteger(patch.skipsPerMonth, 0, MAX_SKIPS_PER_MONTH);
  }

  if (settings.dayStartHour === data.settings.dayStartHour) {
    return { ...data, settings };
  }
  const sessions = data.sessions.map((session) => ({
    ...session,
    day: dayKeyOf(session.startedAt, settings.dayStartHour),
  }));
  return dropSkipsWithActivity({ ...data, sessions, settings });
}
