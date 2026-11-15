import { useEffect, useRef } from 'react';
import { useToast } from '@/components/base/toast/toast-context';
import { displayName, historyOf } from '@/domain/items';
import type { AppData, QuickItem } from '@/domain/types';
import { useAppData, useDispatch, useLastAction } from '@/store/use-app-data';

function findQuick(data: AppData, itemId: string): QuickItem | undefined {
  const item = data.items.find((candidate) => candidate.id === itemId);
  return item?.kind === 'quick' ? item : undefined;
}

function offerCandidate(before: AppData, data: AppData): QuickItem | undefined {
  const pausedId = before.run && data.run?.itemId !== before.run.itemId ? before.run.itemId : null;
  const unpinnedId =
    before.cardItemId !== null && before.cardItemId !== data.cardItemId ? before.cardItemId : null;
  for (const itemId of [pausedId, unpinnedId]) {
    const quick = itemId === null ? undefined : findQuick(data, itemId);
    if (quick && historyOf(data, quick).trackedMs > 0) {
      return quick;
    }
  }
  return undefined;
}

export function useSaveOffer() {
  const data = useAppData((appData) => appData);
  const lastAction = useLastAction();
  const dispatch = useDispatch();
  const showToast = useToast();
  const previousData = useRef(data);
  const offer = useRef<{ itemId: string; dismiss: () => void } | null>(null);
  const offeredIds = useRef(new Set<string>());

  useEffect(() => {
    const before = previousData.current;
    previousData.current = data;

    const current = offer.current;
    if (current && (data.run?.itemId === current.itemId || !findQuick(data, current.itemId))) {
      current.dismiss();
      offer.current = null;
    }

    if (before === data) {
      return;
    }
    if (lastAction?.type === 'reset') {
      offeredIds.current.delete(lastAction.itemId);
      return;
    }
    const quick = offerCandidate(before, data);
    if (!quick || offeredIds.current.has(quick.id)) {
      return;
    }
    offeredIds.current.add(quick.id);
    offer.current?.dismiss();
    const minutes = Math.max(1, Math.round(historyOf(data, quick).trackedMs / 60_000));
    offer.current = {
      itemId: quick.id,
      dismiss: showToast({
        message: `${displayName(quick)} · ${minutes} min`,
        duration: null,
        action: {
          label: 'Add to tasks',
          onAction: () => dispatch({ type: 'saveQuickAsTask', itemId: quick.id }),
        },
      }),
    };
  }, [data, lastAction, dispatch, showToast]);

  useEffect(
    () => () => {
      offer.current?.dismiss();
      offer.current = null;
    },
    []
  );
}
