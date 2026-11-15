import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from './download';

describe('downloadText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should click a temporary download link and revoke the object URL', () => {
    const create = vi.fn(() => 'blob:test');
    const revoke = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
    const clicked: { download: string; href: string; attached: boolean }[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push({
        download: this.download,
        href: this.getAttribute('href') ?? '',
        attached: document.body.contains(this),
      });
    });

    downloadText('notes.txt', 'hello', 'text/plain');

    expect(create).toHaveBeenCalledTimes(1);
    const blob = (create.mock.calls as unknown as [Blob][])[0][0];
    expect(blob.type).toBe('text/plain');
    expect(blob.size).toBe(5);
    expect(clicked).toEqual([{ download: 'notes.txt', href: 'blob:test', attached: true }]);
    expect(document.querySelector('a[download]')).toBeNull();
    expect(revoke).toHaveBeenCalledWith('blob:test');
  });
});
