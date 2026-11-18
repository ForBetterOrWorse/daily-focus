export type TooltipSide = 'top' | 'bottom' | 'start' | 'end';
export type TooltipAlign = 'center' | 'start' | 'end';
export type PhysicalSide = 'top' | 'bottom' | 'left' | 'right';

interface Box {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface PlaceTooltipInput {
  trigger: Box;
  popup: { width: number; height: number };
  viewport: { width: number; height: number };
  side: TooltipSide;
  align: TooltipAlign;
  rtl: boolean;
  /** Gap between the trigger and the tooltip, in px. */
  offset?: number;
  /** Smallest distance kept between the tooltip and the viewport edge, in px. */
  margin?: number;
}

export interface Placement {
  /** Viewport x of the tooltip's left edge. */
  x: number;
  /** Viewport y of the tooltip's top edge. */
  y: number;
  side: PhysicalSide;
}

const OPPOSITE: Record<PhysicalSide, PhysicalSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export function toPhysicalSide(side: TooltipSide, rtl: boolean): PhysicalSide {
  if (side === 'start') {
    return rtl ? 'right' : 'left';
  }
  if (side === 'end') {
    return rtl ? 'left' : 'right';
  }
  return side;
}

/** Places a tooltip on its side of the trigger, flips to the opposite side when it does not fit, and slides it along the edge to stay inside the viewport. */
export function placeTooltip(input: PlaceTooltipInput): Placement {
  const { trigger, popup, viewport, align, rtl, offset = 4, margin = 8 } = input;
  const requested = toPhysicalSide(input.side, rtl);

  function mainAxisStart(side: PhysicalSide) {
    switch (side) {
      case 'top':
        return trigger.top - offset - popup.height;
      case 'bottom':
        return trigger.bottom + offset;
      case 'left':
        return trigger.left - offset - popup.width;
      case 'right':
        return trigger.right + offset;
    }
  }

  function fits(side: PhysicalSide) {
    const start = mainAxisStart(side);
    if (side === 'top' || side === 'bottom') {
      return start >= margin && start + popup.height <= viewport.height - margin;
    }
    return start >= margin && start + popup.width <= viewport.width - margin;
  }

  const side = !fits(requested) && fits(OPPOSITE[requested]) ? OPPOSITE[requested] : requested;
  const horizontalSide = side === 'top' || side === 'bottom';

  // Along the cross axis, `start` is the leading edge of the reading direction.
  let x: number;
  let y: number;
  if (horizontalSide) {
    const leading = rtl ? trigger.right - popup.width : trigger.left;
    const trailing = rtl ? trigger.left : trigger.right - popup.width;
    x =
      align === 'center'
        ? trigger.left + (trigger.width - popup.width) / 2
        : align === 'start'
          ? leading
          : trailing;
    y = mainAxisStart(side);
  } else {
    x = mainAxisStart(side);
    y =
      align === 'center'
        ? trigger.top + (trigger.height - popup.height) / 2
        : align === 'start'
          ? trigger.top
          : trigger.bottom - popup.height;
  }

  const maxX = Math.max(margin, viewport.width - popup.width - margin);
  const maxY = Math.max(margin, viewport.height - popup.height - margin);
  return {
    x: Math.round(Math.min(Math.max(x, margin), maxX)),
    y: Math.round(Math.min(Math.max(y, margin), maxY)),
    side,
  };
}
