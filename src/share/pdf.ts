// Minimal PDF 1.4 writer: one full-page JPEG per page. Written by hand so the
// export needs no library and no network, and Hebrew/RTL text is never handed
// to a PDF text engine (pages are drawn with Canvas, see report.ts).

export interface PdfPage {
  /** Baseline JPEG bytes. */
  jpeg: Uint8Array;
  /** Pixel size of the JPEG. */
  px: [number, number];
}

const enc = new TextEncoder();

/** PDF text string: UTF-16BE with BOM, as hex, so Hebrew titles survive. */
function pdfString(s: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  return `<${hex}>`;
}

/**
 * @param size page size in points (A4 = 595.28 × 841.89)
 */
export function buildPdf(pages: PdfPage[], size: [number, number], title = ''): Uint8Array<ArrayBuffer> {
  if (!pages.length) throw new Error('buildPdf: no pages');
  const [W, H] = size.map((n) => +n.toFixed(2));
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (b: Uint8Array | string) => {
    const bytes = typeof b === 'string' ? enc.encode(b) : b;
    chunks.push(bytes);
    length += bytes.length;
  };
  const obj = (id: number, body: () => void) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
    body();
    push('\nendobj\n');
  };

  // Object ids: 1 catalog, 2 pages, 3 info, then 3 per page (page, contents, image).
  const pageId = (i: number) => 4 + i * 3;
  const total = 3 + pages.length * 3;

  push('%PDF-1.4\n%');
  push(new Uint8Array([0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // binary marker for transfer tools
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] >>`));
  obj(3, () => push(`<< /Producer (NGG) /Title ${pdfString(title)} >>`));
  pages.forEach((p, i) => {
    const id = pageId(i);
    const stream = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    obj(id, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`));
    obj(id + 1, () => push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    obj(id + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.px[0]} /Height ${p.px[1]} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push('\nendstream');
    });
  });

  const xref = length;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= total; id++) table += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(table);
  push(`trailer\n<< /Size ${total + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(new ArrayBuffer(length));
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
