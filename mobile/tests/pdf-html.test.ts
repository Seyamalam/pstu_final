import { describe, expect, it } from 'vitest';

import { createDocumentHtml, escapeHtml } from '../lib/pdf-html';

describe('PDF HTML', () => {
  it('escapes text and attributes', () => {
    expect(escapeHtml(`<script>"x" & 'y'</script>`)).toBe(
      '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/script&gt;',
    );
  });

  it('does not interpolate executable user HTML', () => {
    const html = createDocumentHtml({
      title: '<img src=x onerror=alert(1)>',
      subtitle: 'receipt',
      rows: [{ label: 'Note', value: '<script>alert(1)</script>' }],
      table: { headers: ['Name'], rows: [['<svg/onload=alert(1)>']] },
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<svg/onload=alert(1)>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

