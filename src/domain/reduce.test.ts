import { describe, expect, it } from 'vitest';
import { emptyData } from './schema';
import { reduce } from './reduce';

const NOW = new Date(2026, 9, 28, 12, 0, 0).getTime();

describe('reduce', () => {
  it('should keep a paused item on the card instead of the first listed item', () => {
    const base = emptyData(NOW);
    const input = {
      kind: 'habit',
      completion: 'time',
      target: 30,
      timerStyle: 'free',
    } as const;
    const first = reduce(base, { type: 'addItem', item: { ...input, name: 'Meditate' } }, NOW);
    const both = reduce(first, { type: 'addItem', item: { ...input, name: 'Study' } }, NOW);
    const study = both.items.find((item) => item.name === 'Study')!;

    const started = reduce(both, { type: 'start', itemId: study.id }, NOW);
    const paused = reduce(started, { type: 'pause' }, NOW + 1000);

    expect(paused.run).toBeNull();
    expect(paused.cardItemId).toBe(study.id);
  });

  it('should update settings', () => {
    const data = emptyData(NOW);
    const updated = reduce(data, { type: 'updateSettings', patch: { weekStart: 'sunday' } }, NOW);

    expect(updated.settings.weekStart).toBe('sunday');
  });

  it('should record the export time on markExported', () => {
    const next = reduce(emptyData(NOW), { type: 'markExported' }, NOW + 5);

    expect(next.meta.lastExportAt).toBe(NOW + 5);
  });

  it('should record the dismissal time on dismissBackupBanner', () => {
    const next = reduce(emptyData(NOW), { type: 'dismissBackupBanner' }, NOW + 7);

    expect(next.meta.bannerDismissedAt).toBe(NOW + 7);
  });

  it('should replace local data on importData replace and keep local firstUseAt', () => {
    const local = emptyData(NOW);
    const incoming = emptyData(NOW - 1000);

    const next = reduce(local, { type: 'importData', mode: 'replace', incoming }, NOW);

    expect(next.meta.firstUseAt).toBe(local.meta.firstUseAt);
  });
});
