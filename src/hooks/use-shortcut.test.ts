import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useShortcut } from './use-shortcut';

describe('useShortcut', () => {
  it('should fire Shift+S from the page', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut({ key: 's', shift: true }, handler));

    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should not fire from an editable control', () => {
    const handler = vi.fn();
    render(
      createElement(
        'div',
        null,
        createElement('input', { 'aria-label': 'input' }),
        createElement('textarea', { 'aria-label': 'textarea' }),
        createElement('select', { 'aria-label': 'select' }),
        createElement('div', { contentEditable: true, 'aria-label': 'editable' }),
        createElement('div', { role: 'combobox', 'aria-label': 'combobox' }),
        createElement('div', { role: 'textbox', 'aria-label': 'textbox' })
      )
    );
    renderHook(() => useShortcut({ key: 's', shift: true }, handler));

    for (const target of [
      screen.getByLabelText('input'),
      screen.getByLabelText('textarea'),
      screen.getByLabelText('select'),
      screen.getByLabelText('editable'),
      screen.getByLabelText('combobox'),
      screen.getByLabelText('textbox'),
    ]) {
      fireEvent.keyDown(target, { key: 'S', shiftKey: true });
    }

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not fire from inside an open dialog', () => {
    const handler = vi.fn();
    render(
      createElement(
        'div',
        { role: 'dialog', 'aria-modal': 'true' },
        createElement('button', { type: 'button' }, 'Dialog action')
      )
    );
    renderHook(() => useShortcut({ key: 's', shift: true }, handler));

    fireEvent.keyDown(screen.getByRole('button'), { key: 'S', shiftKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should fire backslash without Shift', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut({ key: '\\' }, handler));

    fireEvent.keyDown(document.body, { key: '\\' });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('should not fire when disabled', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut({ key: 's', shift: true }, handler, { enabled: false }));

    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should ignore repeated, handled, and incorrectly modified key events', () => {
    const handler = vi.fn();
    renderHook(() => useShortcut({ key: 's', shift: true }, handler));

    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true, repeat: true });
    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true, ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true, metaKey: true });
    fireEvent.keyDown(document.body, { key: 'S', shiftKey: true, altKey: true });
    fireEvent.keyDown(document.body, { key: 'S' });
    const preventDefault = (event: Event) => event.preventDefault();
    document.addEventListener('keydown', preventDefault, true);
    try {
      fireEvent.keyDown(document.body, { key: 'S', shiftKey: true, cancelable: true });
    } finally {
      document.removeEventListener('keydown', preventDefault, true);
    }

    expect(handler).not.toHaveBeenCalled();
  });
});
