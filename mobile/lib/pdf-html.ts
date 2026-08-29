export function escapeHtml(value: unknown) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export type PdfRow = { label: string; value: string };

export function createDocumentHtml(input: {
  title: string;
  subtitle: string;
  rows: readonly PdfRow[];
  table?: { headers: readonly string[]; rows: readonly (readonly string[])[] };
}) {
  const summaryRows = input.rows
    .map(
      ({ label, value }) =>
        `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    )
    .join('');
  const table = input.table
    ? `<table><thead><tr>${input.table.headers.map((value) => `<th>${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${input.table.rows
        .map(
          (row) =>
            `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody></table>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 36px; } body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #17211b; }
  h1 { margin: 0 0 6px; font-size: 28px; } p { margin: 0 0 28px; color: #5f6b64; }
  .row { display: flex; justify-content: space-between; gap: 24px; padding: 12px 0; border-bottom: 1px solid #dfe6e1; }
  table { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 12px; }
  th, td { padding: 10px 8px; border-bottom: 1px solid #dfe6e1; text-align: left; }
  th { color: #5f6b64; font-weight: 600; }
  </style></head><body><h1>${escapeHtml(input.title)}</h1><p>${escapeHtml(input.subtitle)}</p>${summaryRows}${table}</body></html>`;
}

