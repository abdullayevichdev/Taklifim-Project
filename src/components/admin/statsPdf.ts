/**
 * Builds the "Tashrifim statistikasi" PDF report (A4) with jsPDF — vector charts, embedded
 * Manrope / Playfair fonts so Uzbek letters (o‘, g‘) render correctly. Loaded on demand only.
 */
export interface StatsPdfData {
  rangeDays: number;
  generatedAt: Date;
  kpis: Array<{ label: string; value: string }>;
  revenueDaily: Array<{ label: string; value: number }>;
  dayLabels: string[];
  ordersDaily: number[];
  usersDaily: number[];
  statusSegments: Array<{ label: string; value: number; color: string }>;
  topTemplates: Array<{ label: string; count: number; sum: number }>;
  recentPaid: Array<{ id: string; customer: string; template: string; price: number; date: string }>;
}

const ROSE = '#C64873';
const INK = '#1E1418';
const MUTED = '#7A6A63';
const GRID = '#ECE7E4';
const SOFT = '#FAF5F2';
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a'];

const group = (n: number) => String(Math.round(Math.abs(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const money = (n: number) => `${n < 0 ? '-' : ''}${group(n)} so‘m`;
const compact = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : String(Math.round(n));

/** Keeps only glyphs the embedded fonts have (Uzbek ʻ → ‘, missing Cyrillic letters → nearest, emoji removed). */
export function pdfText(s: string): string {
  return String(s ?? '')
    .replace(/ʻ/g, '‘')
    .replace(/ʼ/g, '’')
    .replace(/[ғҒ]/g, (c) => (c === 'ғ' ? 'г' : 'Г'))
    .replace(/[қҚ]/g, (c) => (c === 'қ' ? 'к' : 'К'))
    .replace(/[ҳҲ]/g, (c) => (c === 'ҳ' ? 'х' : 'Х'))
    .replace(/[☀-➿️]|[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/ /g, ' ')
    .trim();
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => n <= x) || 10) * p;
}

async function fontBase64(url: string): Promise<string> {
  const buf = await (await fetch(url)).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function downloadStatsPdf(d: StatsPdfData): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const [reg, bold, play] = await Promise.all([
    fontBase64('/fonts/pdf/Manrope-Regular.ttf'),
    fontBase64('/fonts/pdf/Manrope-Bold.ttf'),
    fontBase64('/fonts/pdf/PlayfairDisplay-Bold.ttf'),
  ]);
  doc.addFileToVFS('Manrope-Regular.ttf', reg);
  doc.addFont('Manrope-Regular.ttf', 'Manrope', 'normal');
  doc.addFileToVFS('Manrope-Bold.ttf', bold);
  doc.addFont('Manrope-Bold.ttf', 'Manrope', 'bold');
  doc.addFileToVFS('Playfair-Bold.ttf', play);
  doc.addFont('Playfair-Bold.ttf', 'Playfair', 'bold');

  const W = 210;
  const H = 297;
  const M = 14;
  const CW = W - 2 * M;

  const text = (s: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: string; align?: 'left' | 'right' | 'center'; font?: 'Manrope' | 'Playfair'; maxWidth?: number } = {}) => {
    doc.setFont(opts.font || 'Manrope', opts.font === 'Playfair' || opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 9);
    doc.setTextColor(opts.color || INK);
    let str = pdfText(s);
    if (opts.maxWidth) {
      while (str.length > 1 && doc.getTextWidth(str) > opts.maxWidth) str = str.slice(0, -2) + '…';
    }
    doc.text(str, x, y, { align: opts.align || 'left' });
  };

  const periodFrom = new Date(d.generatedAt.getTime() - (d.rangeDays - 1) * 86400000);
  const fmtDay = (dt: Date) => dt.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  /* ---------- header band ---------- */
  const header = (pageTitle?: string) => {
    doc.setFillColor(ROSE);
    doc.rect(0, 0, W, pageTitle ? 22 : 46, 'F');
    doc.setFillColor('#D9658B');
    doc.circle(W - 18, -6, pageTitle ? 20 : 34, 'F');
    // logo mark: rounded square + envelope
    const lx = M;
    const ly = pageTitle ? 6 : 10;
    const ls = pageTitle ? 10 : 14;
    doc.setFillColor('#FFFFFF');
    doc.roundedRect(lx, ly, ls, ls, 3, 3, 'F');
    doc.setDrawColor(ROSE);
    doc.setLineWidth(0.6);
    doc.roundedRect(lx + ls * 0.2, ly + ls * 0.32, ls * 0.6, ls * 0.42, 0.8, 0.8, 'S');
    doc.line(lx + ls * 0.22, ly + ls * 0.36, lx + ls * 0.5, ly + ls * 0.56);
    doc.line(lx + ls * 0.78, ly + ls * 0.36, lx + ls * 0.5, ly + ls * 0.56);
    if (pageTitle) {
      text('TASHRIFIM', lx + ls + 4, ly + 6.8, { font: 'Playfair', size: 12, color: '#FFFFFF' });
      text(pageTitle, W - M, ly + 6.8, { size: 9, color: '#FFFFFF', align: 'right' });
      return 30;
    }
    text('TASHRIFIM', lx + ls + 5, ly + 6, { font: 'Playfair', size: 15, color: '#FFFFFF' });
    text('Onlayn taklifnomalar platformasi', lx + ls + 5, ly + 11.5, { size: 8, color: '#FCE4EE' });
    text('Abdulhay Avazxanov — Tashrifim saytining statistikasi', M, 36, { font: 'Playfair', size: 15, color: '#FFFFFF' });
    text(
      `Davr: ${fmtDay(periodFrom)} — ${fmtDay(d.generatedAt)} (${d.rangeDays} kun)   ·   Tayyorlangan: ${d.generatedAt.toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      M,
      42,
      { size: 8, color: '#FCE4EE' }
    );
    return 54;
  };

  const sectionTitle = (title: string, subtitle: string, y: number) => {
    doc.setFillColor(ROSE);
    doc.roundedRect(M, y - 3.6, 1.4, 5, 0.7, 0.7, 'F');
    text(title, M + 4, y, { bold: true, size: 11.5 });
    if (subtitle) text(subtitle, M + 4, y + 4.6, { size: 7.5, color: MUTED });
    return y + (subtitle ? 9 : 6);
  };

  const card = (x: number, y: number, w: number, h: number) => {
    doc.setFillColor(SOFT);
    doc.setDrawColor(GRID);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 3, 3, 'FD');
  };

  /* ---------- page 1 ---------- */
  let y = header();

  // KPI tiles (4 per row)
  const cols = 4;
  const gap = 4;
  const tw = (CW - gap * (cols - 1)) / cols;
  const th = 19;
  d.kpis.forEach((k, i) => {
    const x = M + (i % cols) * (tw + gap);
    const ty = y + Math.floor(i / cols) * (th + gap);
    card(x, ty, tw, th);
    text(k.label.toUpperCase(), x + 4, ty + 6.5, { size: 6.5, bold: true, color: MUTED, maxWidth: tw - 8 });
    text(k.value, x + 4, ty + 14, { size: 11.5, bold: true, maxWidth: tw - 8 });
  });
  y += Math.ceil(d.kpis.length / cols) * (th + gap) + 4;

  // Revenue column chart
  y = sectionTitle('Kunlik tushum', `Tasdiqlangan to‘lovlar, so‘m · oxirgi ${d.rangeDays} kun`, y);
  {
    const ch = 58;
    card(M, y, CW, ch + 12);
    const px = M + 16;
    const pw = CW - 22;
    const py = y + 6;
    const max = niceMax(Math.max(0, ...d.revenueDaily.map((r) => r.value)));
    doc.setLineWidth(0.15);
    [0, 0.5, 1].forEach((f) => {
      const gy = py + ch - f * ch;
      doc.setDrawColor(GRID);
      doc.line(px, gy, px + pw, gy);
      text(compact(f * max), px - 2, gy + 1, { size: 6.5, color: MUTED, align: 'right' });
    });
    const n = d.revenueDaily.length || 1;
    const band = pw / n;
    const bw = Math.min(6, band * 0.7);
    let peak = 0;
    d.revenueDaily.forEach((r, i) => {
      if (r.value > d.revenueDaily[peak].value) peak = i;
    });
    const every = Math.max(1, Math.ceil(n / 12));
    d.revenueDaily.forEach((r, i) => {
      const h = (r.value / max) * ch;
      const bx = px + i * band + (band - bw) / 2;
      if (h > 0.2) {
        doc.setFillColor(ROSE);
        doc.roundedRect(bx, py + ch - h, bw, h, Math.min(0.9, bw / 2), Math.min(0.9, bw / 2), 'F');
        if (h > 1) doc.rect(bx, py + ch - Math.min(h, 1), bw, Math.min(h, 1), 'F'); // square baseline
      }
      if (i === peak && r.value > 0) text(compact(r.value), bx + bw / 2, py + ch - h - 1.5, { size: 6.5, bold: true, align: 'center' });
      if (i % every === 0) text(r.label, px + i * band + band / 2, py + ch + 4.5, { size: 6, color: MUTED, align: 'center' });
    });
    y += ch + 18;
  }

  // Orders vs new users line chart
  y = sectionTitle('Cheklar va yangi foydalanuvchilar', 'Kunlik soni', y);
  {
    const ch = 44;
    card(M, y, CW, ch + 18);
    // legend
    const legend = [
      ['Yuborilgan cheklar', SERIES[0]],
      ['Yangi foydalanuvchilar', SERIES[1]],
    ];
    let lx = M + 6;
    legend.forEach(([label, color]) => {
      doc.setDrawColor(color);
      doc.setLineWidth(0.7);
      doc.line(lx, y + 5, lx + 5, y + 5);
      text(label, lx + 6.5, y + 6, { size: 7, color: '#52514E' });
      doc.setFont('Manrope', 'normal');
      doc.setFontSize(7);
      lx += 12 + doc.getTextWidth(pdfText(label));
    });
    const px = M + 12;
    const pw = CW - 18;
    const py = y + 10;
    const max = niceMax(Math.max(1, ...d.ordersDaily, ...d.usersDaily));
    doc.setLineWidth(0.15);
    [0, 0.5, 1].forEach((f) => {
      const gy = py + ch - f * ch;
      doc.setDrawColor(GRID);
      doc.line(px, gy, px + pw, gy);
      text(compact(f * max), px - 2, gy + 1, { size: 6.5, color: MUTED, align: 'right' });
    });
    const n = d.dayLabels.length;
    const xAt = (i: number) => px + (n <= 1 ? pw / 2 : (i / (n - 1)) * pw);
    const yAt = (v: number) => py + ch - (v / max) * ch;
    [d.ordersDaily, d.usersDaily].forEach((vals, si) => {
      doc.setDrawColor(SERIES[si]);
      doc.setLineWidth(0.6);
      for (let i = 1; i < vals.length; i++) doc.line(xAt(i - 1), yAt(vals[i - 1]), xAt(i), yAt(vals[i]));
      if (vals.length) {
        doc.setFillColor(SERIES[si]);
        doc.circle(xAt(vals.length - 1), yAt(vals[vals.length - 1]), 1, 'F');
      }
    });
    const every = Math.max(1, Math.ceil(n / 12));
    d.dayLabels.forEach((l, i) => {
      if (i % every === 0) text(l, xAt(i), py + ch + 4.5, { size: 6, color: MUTED, align: 'center' });
    });
  }

  /* ---------- page 2 ---------- */
  doc.addPage();
  y = header('Statistika hisoboti');

  // Status breakdown
  y = sectionTitle('Buyurtmalar holati', `Oxirgi ${d.rangeDays} kun`, y);
  {
    const total = d.statusSegments.reduce((s, x) => s + x.value, 0);
    card(M, y, CW, 30);
    let bx = M + 6;
    const bwTotal = CW - 12;
    const segs = d.statusSegments.filter((s) => s.value > 0);
    if (total > 0) {
      segs.forEach((s, i) => {
        const w = (s.value / total) * bwTotal - (i < segs.length - 1 ? 0.6 : 0);
        doc.setFillColor(s.color);
        doc.rect(bx, y + 5, Math.max(0.5, w), 6, 'F');
        bx += w + 0.6;
      });
    } else {
      doc.setFillColor(GRID);
      doc.rect(bx, y + 5, bwTotal, 6, 'F');
    }
    d.statusSegments.forEach((s, i) => {
      const lx = M + 6 + i * (bwTotal / 3);
      doc.setFillColor(s.color);
      doc.roundedRect(lx, y + 17, 3, 3, 0.6, 0.6, 'F');
      text(s.label, lx + 5, y + 19.6, { size: 8, color: '#52514E' });
      text(`${s.value} ta · ${total ? Math.round((s.value / total) * 100) : 0}%`, lx + 5, y + 24.6, { size: 8.5, bold: true });
    });
    y += 38;
  }

  // Table helper
  const table = (head: string[], widths: number[], rows: string[][], aligns: Array<'left' | 'right'>, startY: number) => {
    let ty = startY;
    doc.setFillColor('#F3EEEA');
    doc.roundedRect(M, ty, CW, 8, 2, 2, 'F');
    let x = M + 3;
    head.forEach((h, i) => {
      text(h, aligns[i] === 'right' ? x + widths[i] - 3 : x, ty + 5.3, { size: 7, bold: true, color: MUTED, align: aligns[i] });
      x += widths[i];
    });
    ty += 8;
    rows.forEach((r, ri) => {
      if (ty > H - 22) {
        doc.addPage();
        ty = header('Statistika hisoboti');
      }
      if (ri % 2 === 1) {
        doc.setFillColor('#FCFAF9');
        doc.rect(M, ty, CW, 7.5, 'F');
      }
      let cx = M + 3;
      r.forEach((c, i) => {
        text(c, aligns[i] === 'right' ? cx + widths[i] - 3 : cx, ty + 5, { size: 8, align: aligns[i], maxWidth: widths[i] - 4, bold: i === r.length - 1 && aligns[i] === 'right' });
        cx += widths[i];
      });
      ty += 7.5;
    });
    if (rows.length === 0) {
      text('Bu davrda ma’lumot yo‘q', M + 3, ty + 6, { size: 8, color: MUTED });
      ty += 10;
    }
    return ty + 6;
  };

  y = sectionTitle('Shablonlar reytingi', 'Sotuvlar soni va tushum', y);
  {
    const maxCount = Math.max(1, ...d.topTemplates.map((t) => t.count));
    const rows = d.topTemplates.map((t, i) => [`${i + 1}. ${t.label}`, '', `${t.count} ta`, money(t.sum)]);
    const widths = [70, 50, 24, CW - 150];
    const startY = y;
    y = table(['Shablon', 'Ulush', 'Sotuv', 'Tushum'], widths, rows, ['left', 'left', 'right', 'right'], y);
    // inline bars in the "Ulush" column
    d.topTemplates.forEach((t, i) => {
      const by = startY + 8 + i * 7.5 + 2.2;
      doc.setFillColor('#EFE8E4');
      doc.rect(M + 3 + 70, by, 44, 2.6, 'F');
      doc.setFillColor(SERIES[0]);
      doc.rect(M + 3 + 70, by, (t.count / maxCount) * 44, 2.6, 'F');
    });
  }

  y = sectionTitle('So‘nggi tasdiqlangan to‘lovlar', `Oxirgi ${d.recentPaid.length} ta`, y);
  y = table(
    ['Buyurtma', 'Mijoz', 'Shablon', 'Sana', 'Summa'],
    [30, 46, 44, 30, CW - 156],
    d.recentPaid.map((o) => [o.id, o.customer, o.template, o.date, money(o.price)]),
    ['left', 'left', 'left', 'left', 'right'],
    y
  );

  /* ---------- footers ---------- */
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(GRID);
    doc.setLineWidth(0.2);
    doc.line(M, H - 12, W - M, H - 12);
    text('tashrifim.uz · Abdulhay Avazxanov', M, H - 7, { size: 7, color: MUTED });
    text(`${p} / ${pages}`, W - M, H - 7, { size: 7, color: MUTED, align: 'right' });
  }

  const stamp = d.generatedAt.toISOString().slice(0, 10);
  doc.save(`Tashrifim-statistika-${stamp}.pdf`);
}
