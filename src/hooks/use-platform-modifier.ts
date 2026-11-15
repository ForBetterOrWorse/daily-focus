import { useEffect, useState } from 'react';

export type AltLabel = '⌥' | 'Alt';
export type CmdLabel = '⌘' | 'Ctrl';

function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

export function getAltLabel(): AltLabel {
  return isMacPlatform() ? '⌥' : 'Alt';
}

export function useAltLabel(): AltLabel {
  const [label, setLabel] = useState<AltLabel>('Alt');

  useEffect(() => {
    setLabel(getAltLabel());
  }, []);

  return label;
}

export function getCmdLabel(): CmdLabel {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

export function useCmdLabel(): CmdLabel {
  const [label, setLabel] = useState<CmdLabel>('Ctrl');

  useEffect(() => {
    setLabel(getCmdLabel());
  }, []);

  return label;
}
