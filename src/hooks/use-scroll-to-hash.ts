import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useReducedMotion } from './use-reduced-motion';

function currentHash(): string {
  return typeof window === 'undefined' ? '' : window.location.hash;
}

function findTarget(hash: string): HTMLElement | null {
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // keep the raw id when the hash is not valid percent-encoding
  }
  return id ? document.getElementById(id) : null;
}

export function useScrollToHash(): void {
  const [path] = useLocation();
  const [hash, setHash] = useState(currentHash);
  const reduced = useReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const update = () => {
      setHash(currentHash());
    };
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('hashchange', update);
    };
  }, []);

  useEffect(() => {
    const live = currentHash();
    if (!live) {
      return;
    }

    const scrollTo = (target: HTMLElement) => {
      target.scrollIntoView({ behavior: reducedRef.current ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    };

    const target = findTarget(live);
    if (target) {
      scrollTo(target);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const late = findTarget(currentHash());
      if (late) {
        scrollTo(late);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [path, hash]);
}
