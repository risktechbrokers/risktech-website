import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PRODUCTS, broker } from './config.js';

const A4 = [595.28, 841.89];
const L = 48, R = 550;

const latin = (s) => String(s ?? '').replace(/[^\x20-\x7E -ÿ]/g, '?');
const longDate = (iso) =>
  new Date(String(iso).slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

function bgBytes() {
  const candidates = [
    path.join(process.cwd(), 'api/_assets/npf-bg.jpg'),
    path.join(path.dirname(new URL(import.meta.url).pathname), '../_assets/npf-bg.jpg'),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return fs.readFileSync(c);
  throw new Error('Certificate background missing (api/_assets/npf-bg.jpg).');
}

function wrap(text, font, size, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(t, size) <= maxW) line = t;
      else { if (line) out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

export async function buildCertificate(app) {
  const prod = PRODUCTS[app.product];
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${app.certificate_no}`);
  pdf.setAuthor(broker.name);
  const page = pdf.addPage(A4);
  const H = A4[1];

  const bg = await pdf.embedJpg(bgBytes());
  page.drawImage(bg, { x: 0, y: 0, width: A4[0], height: A4[1] });

  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const ink = rgb(0.08, 0.08, 0.1);

  const text = (t, x, yTop, { size = 9.5, font = reg, color = ink } = {}) =>
    page.drawText(latin(t), { x, y: H - yTop, size, font, color });
  const right = (t, xRight, yTop, opts = {}) => {
    const font = opts.font || reg; const size = opts.size || 9.5;
    text(t, xRight - font.widthOfTextAtSize(latin(t), size), yTop, opts);
  };

  // Header row
  const hdr = [['CERTIFICATE NO', app.certificate_no, 48], ['POLICY NO', app.policy_no, 213], ['Brown Card', app.brown_card_no || 'N/A', 379]];
  for (const [lab, val, x] of hdr) {
    text(lab, x, 138, { size: 8.5 });
    text(val, x, 152, { size: 8.5 });
  }
  page.drawLine({ start: { x: L, y: H - 168 }, end: { x: R, y: H - 168 }, thickness: 0.6, color: ink });

  // Numbered particulars
  const rows = [
    ['1. Index Mark and Registration No. of Vehicle:', app.reg_no, 191],
    ['2. Vehicle Make:', `${app.vehicle_make} (${app.vehicle_model})`, 209],
    ['3. Name of Policy Holder:', app.insured_name, 226],
  ];
  for (const [label, val, y] of rows) {
    text(label, L, y, { size: 10 });
    right(val, R, y, { font: bold, size: 10 });
  }
  text('4. Effective Date of Commencement of Insurance for the purposes of', L, 244, { size: 10 });
  text('the Ordinance(s):', L, 257, { size: 10 });
  right(longDate(app.start_date), R, 244, { font: bold, size: 10 });
  text('5. Date of Expiry of Insurance:', L, 275, { size: 10 });
  right(longDate(app.end_date), R, 275, { font: bold, size: 10 });

  // 6. Persons entitled to drive
  text('6. Persons or Classes of Persons Entitled to Drive:', L, 302, { font: bold, size: 9.5 });
  text('(a) The Policy holder.', L, 317, { size: 9 });
  const b = "(b) Any other person who is driving on the Policy holder's order or with his/her permission provided that the person is permitted in accordance with licensing laws or regulations to drive the Motor Vehicle and is not disqualified by order of a Court of Law or by reason of any enactment or regulation in that behalf from driving such Motor Car.";
  let y = 330;
  for (const ln of wrap(b, reg, 9, R - L)) { text(ln, L, y, { size: 9 }); y += 12.2; }

  // 7. Limitation to use
  y += 16;
  text('7. Limitation to use:', L, y, { font: bold, size: 9.5 });
  y += 14;
  text(prod.limitation, L, y, { font: bold, size: 9.5 });
  y += 28;
  const use = "Use in connection with the Policy holder's business whilst the vehicle is being used in the carriage of passengers (other than for hire or reward) is permitted to Use for social domestic and pleasure purposes.";
  for (const ln of wrap(use, reg, 9, R - L)) { text(ln, L, y, { size: 9 }); y += 12.2; }
  text('The policy does not cover:', L, y, { size: 9 });
  y += 17;
  text('1. Use for hire or reward or for racing or pace-making, reliability trial or speed testing', L, y, { size: 9 });
  y += 13;
  text('2. Use whilst drawing a trailer except the towing of anyone disabled mechanically propelled vehicle', L, y, { size: 9 });
  y += 24;
  text('WAZ 101', L, y, { size: 8.5 });
  y += 12;
  const fn = '*Limitations rendered inoperative by the provisions of the Motor Private Third-Party Act 1975 (Nigeria) are not included under this heading.';
  for (const ln of wrap(fn, reg, 7.5, R - L)) { text(ln, L, y, { size: 7.5 }); y += 9.5; }

  // Broker line (lower left, clear of the NPF signature and footer)
  text(`Issued through ${broker.name}`, L, 712, { font: ital, size: 8 });
  text(`NAICOM Licence No. ${broker.naicom}`, L, 723, { font: ital, size: 8 });

  return Buffer.from(await pdf.save());
}
