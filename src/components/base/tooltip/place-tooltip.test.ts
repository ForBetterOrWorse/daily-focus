import { describe, expect, it } from 'vitest';
import { placeTooltip, type PlaceTooltipInput } from './place-tooltip';

const base: PlaceTooltipInput = {
  trigger: { top: 300, right: 540, bottom: 340, left: 500, width: 40, height: 40 },
  popup: { width: 120, height: 30 },
  viewport: { width: 1000, height: 800 },
  side: 'top',
  align: 'center',
  rtl: false,
};

describe('placeTooltip', () => {
  it('should place the tooltip on its requested side', () => {
    expect(placeTooltip(base)).toEqual({ x: 460, y: 266, side: 'top' });
  });

  it('should flip when the requested side does not fit', () => {
    expect(
      placeTooltip({
        ...base,
        trigger: { ...base.trigger, top: 10, bottom: 50 },
      }).side
    ).toBe('bottom');
  });

  it('should keep the tooltip within viewport margins', () => {
    expect(
      placeTooltip({
        ...base,
        trigger: { ...base.trigger, left: 0, right: 20, width: 20 },
      }).x
    ).toBe(8);
  });

  it('should resolve logical sides for right-to-left layouts', () => {
    expect(placeTooltip({ ...base, side: 'start', rtl: true }).side).toBe('right');
    expect(placeTooltip({ ...base, side: 'end', rtl: true }).side).toBe('left');
  });
});
