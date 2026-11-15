import { describe, expect, it } from 'vitest';
import { MAX_SKIPS_PER_MONTH } from './settings';
import { emptyData, InvalidDataError, parseData } from './schema';

describe('emptyData', () => {
  it('should create defaults and round-trip through the data parser', () => {
    const data = emptyData(1_700_000_000_000);

    expect(data.groups.map((group) => group.name)).toEqual([
      'Work',
      'Health',
      'Learning',
      'Chores',
      'Hobby',
    ]);
    expect(data.meta).toMatchObject({
      firstUseAt: 1_700_000_000_000,
      quickStyle: 'free',
      columnsOpen: null,
      lastQuickNumber: null,
    });
    expect(data.cardItemId).toBeNull();
    expect(parseData(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });
});

describe('parseData', () => {
  const validData = emptyData(1_700_000_000_000);

  it.each([
    ['a non-object', null],
    ['an array', []],
    ['a missing field', { ...validData, groups: undefined }],
    ['a wrong field type', { ...validData, groups: 'groups' }],
    ['an unsupported version', { ...validData, version: 2 }],
    [
      'a malformed nested value',
      {
        ...validData,
        settings: { ...validData.settings, dayStartHour: 24 },
      },
    ],
  ])('should reject %s with a reason', (_label, input) => {
    expect(() => parseData(input)).toThrow(InvalidDataError);
    expect(() => parseData(input)).toThrow(/.+/);
  });

  it('should reject quick items with goals', () => {
    const quickItem = {
      id: 'quick-1',
      kind: 'quick',
      name: '',
      groupId: null,
      completion: 'time',
      goals: [{ from: '2026-01-01', target: 1 }],
      timerStyle: 'free',
      number: 1,
      day: '2026-01-01',
      createdAt: 1,
      updatedAt: 1,
    };

    expect(() =>
      parseData({
        ...validData,
        items: [quickItem],
      })
    ).toThrow(InvalidDataError);
  });

  it.each([
    { completion: 'count', target: 1000 },
    { completion: 'count', target: 2.5 },
    { completion: 'time', target: 4 },
    { completion: 'time', target: 1441 },
  ])('should reject a $completion goal of $target', ({ completion, target }) => {
    const task = {
      id: 'task-1',
      kind: 'task',
      name: 'Read',
      groupId: null,
      completion,
      goals: [{ from: '2026-01-01', target }],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(() => parseData({ ...validData, items: [task] })).toThrow(
      'data.items[0].goals[0].target'
    );
  });

  it('should load a stored count goal saved under the earlier 999 cap', () => {
    const task = {
      id: 'task-1',
      kind: 'task',
      name: 'Read',
      groupId: null,
      completion: 'count',
      goals: [{ from: '2026-01-01', target: 50 }],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(() => parseData({ ...validData, items: [task] })).not.toThrow();
  });

  it('should cap a stored skips per month above the maximum on load', () => {
    const parsed = parseData({
      ...validData,
      settings: { ...validData.settings, skipsPerMonth: 50 },
    });

    expect(parsed.settings.skipsPerMonth).toBe(MAX_SKIPS_PER_MONTH);
  });

  it('should reject a habit without scheduled days', () => {
    const habit = {
      id: 'habit-1',
      kind: 'habit',
      name: 'Read',
      groupId: null,
      completion: 'check',
      goals: [],
      createdAt: 1,
      updatedAt: 1,
    };

    expect(() =>
      parseData({
        ...validData,
        items: [habit],
      })
    ).toThrow('data.items[0].days');
  });

  it('should require card and run references to existing items', () => {
    const withoutItems = { ...validData, cardItemId: 'missing' };
    expect(() => parseData(withoutItems)).toThrow('data.cardItemId');

    const withMissingRun = {
      ...validData,
      run: {
        itemId: 'missing',
        startedAt: 1,
        clock: {
          style: 'free',
          phase: 'focus',
          round: 1,
          elapsedMs: 0,
          day: '2026-01-01',
        },
      },
    };
    expect(() => parseData(withMissingRun)).toThrow('data.run.itemId');
  });

  it('should drop unknown fields at every parsed level', () => {
    const input = {
      ...validData,
      unexpected: 'top-level',
      groups: [{ ...validData.groups[0], unexpected: 'group-level' }],
      settings: { ...validData.settings, unexpected: 'settings-level' },
    };

    const parsed = parseData(input);

    expect(parsed).not.toHaveProperty('unexpected');
    expect(parsed.groups[0]).not.toHaveProperty('unexpected');
    expect(parsed.settings).not.toHaveProperty('unexpected');
  });

  it('should report the invalid field in its reason', () => {
    expect(() =>
      parseData({
        ...validData,
        settings: { ...validData.settings, dayStartHour: 24 },
      })
    ).toThrow('data.settings.dayStartHour');
  });
});
