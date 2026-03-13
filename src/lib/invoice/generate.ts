/**
 * Invoice PDF generation using pdf-lib.
 * Generates a professional French invoice (facture) for Theralib bookings.
 *
 * Most wellness professionals in France are auto-entrepreneurs
 * and are exempt from TVA, so we include the mention:
 * "TVA non applicable, art. 293 B du CGI"
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceData {
  invoiceNumber: string;         // "TL-2026-0001"
  invoiceDate: string;           // "12/03/2026"
  // Professional (seller)
  proBusinessName: string;
  proAddress: string;            // formatted "12 rue X, 75001 Paris"
  proSiret?: string;
  proEmail?: string;
  // Client (buyer)
  clientName: string;
  clientEmail: string;
  // Service
  serviceName: string;
  serviceDuration: number;       // minutes
  serviceDate: string;           // "11 mars 2026"
  serviceTime: string;           // "14:00 — 15:00"
  // Payment
  amount: number;                // euros
  paymentMethod: string;         // "En ligne" | "Sur place"
  paidAt: string;                // "11/03/2026"
}

const BRAND_TEAL_RGB = rgb(45 / 255, 212 / 255, 191 / 255);   // #2dd4bf
const BRAND_PETROL_RGB = rgb(15 / 255, 23 / 255, 42 / 255);    // #0f172a
const GRAY_600_RGB = rgb(75 / 255, 85 / 255, 99 / 255);        // #4b5563
const GRAY_400_RGB = rgb(156 / 255, 163 / 255, 175 / 255);     // #9ca3af
const LIGHT_BG_RGB = rgb(248 / 255, 250 / 255, 252 / 255);     // #f8fafc
const WHITE_RGB = rgb(1, 1, 1);
const BLACK_RGB = rgb(0, 0, 0);

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = height;

  // ─── Header bar ───
  const headerHeight = 60;
  page.drawRectangle({
    x: 0, y: height - headerHeight,
    width, height: headerHeight,
    color: BRAND_PETROL_RGB,
  });

  // Logo text "theralib"
  page.drawText('thera', {
    x: 40, y: height - 38,
    size: 20, font: fontBold,
    color: GRAY_400_RGB,
  });
  page.drawText('lib', {
    x: 40 + fontBold.widthOfTextAtSize('thera', 20),
    y: height - 38,
    size: 20, font: fontBold,
    color: WHITE_RGB,
  });

  // FACTURE title
  page.drawText('FACTURE', {
    x: width - 40 - fontBold.widthOfTextAtSize('FACTURE', 18),
    y: height - 38,
    size: 18, font: fontBold,
    color: BRAND_TEAL_RGB,
  });

  y = height - headerHeight - 40;

  // ─── Invoice metadata ───
  const metaX = width - 40;

  const drawRightAligned = (text: string, yPos: number, size: number, font: typeof fontRegular, color = GRAY_600_RGB) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: metaX - tw, y: yPos, size, font, color });
  };

  drawRightAligned(`N° ${data.invoiceNumber}`, y, 11, fontBold, BRAND_PETROL_RGB);
  y -= 18;
  drawRightAligned(`Date : ${data.invoiceDate}`, y, 10, fontRegular);
  y -= 16;
  drawRightAligned(`Payé le : ${data.paidAt}`, y, 10, fontRegular);

  // ─── FROM (Pro) ───
  let blockY = height - headerHeight - 40;
  page.drawText('De', { x: 40, y: blockY, size: 9, font: fontRegular, color: GRAY_400_RGB });
  blockY -= 16;
  page.drawText(data.proBusinessName, { x: 40, y: blockY, size: 12, font: fontBold, color: BRAND_PETROL_RGB });
  blockY -= 16;
  page.drawText(data.proAddress, { x: 40, y: blockY, size: 10, font: fontRegular, color: GRAY_600_RGB });
  if (data.proSiret) {
    blockY -= 14;
    page.drawText(`SIRET : ${data.proSiret}`, { x: 40, y: blockY, size: 9, font: fontRegular, color: GRAY_600_RGB });
  }
  if (data.proEmail) {
    blockY -= 14;
    page.drawText(data.proEmail, { x: 40, y: blockY, size: 9, font: fontRegular, color: GRAY_600_RGB });
  }

  // ─── TO (Client) ───
  y = blockY - 30;
  page.drawText('Facturé à', { x: 40, y, size: 9, font: fontRegular, color: GRAY_400_RGB });
  y -= 16;
  page.drawText(data.clientName, { x: 40, y, size: 12, font: fontBold, color: BRAND_PETROL_RGB });
  y -= 16;
  page.drawText(data.clientEmail, { x: 40, y, size: 10, font: fontRegular, color: GRAY_600_RGB });

  // ─── Table ───
  y -= 40;
  const tableX = 40;
  const tableW = width - 80;
  const colWidths = [tableW * 0.45, tableW * 0.15, tableW * 0.2, tableW * 0.2]; // Description, Durée, Date, Prix
  const colXs = [
    tableX,
    tableX + colWidths[0],
    tableX + colWidths[0] + colWidths[1],
    tableX + colWidths[0] + colWidths[1] + colWidths[2],
  ];

  // Table header
  const tableHeaderH = 32;
  page.drawRectangle({
    x: tableX, y: y - tableHeaderH + 10,
    width: tableW, height: tableHeaderH,
    color: BRAND_PETROL_RGB,
  });

  const headers = ['Description', 'Durée', 'Date', 'Prix'];
  headers.forEach((h, i) => {
    page.drawText(h, {
      x: colXs[i] + 8, y: y - 8,
      size: 9, font: fontBold, color: WHITE_RGB,
    });
  });

  y -= tableHeaderH + 4;

  // Table row
  const rowH = 44;
  page.drawRectangle({
    x: tableX, y: y - rowH + 10,
    width: tableW, height: rowH,
    color: LIGHT_BG_RGB,
  });

  // Service name
  page.drawText(data.serviceName, {
    x: colXs[0] + 8, y: y - 6,
    size: 10, font: fontBold, color: BRAND_PETROL_RGB,
  });
  page.drawText(data.serviceTime, {
    x: colXs[0] + 8, y: y - 20,
    size: 9, font: fontRegular, color: GRAY_600_RGB,
  });

  // Duration
  page.drawText(`${data.serviceDuration} min`, {
    x: colXs[1] + 8, y: y - 10,
    size: 10, font: fontRegular, color: GRAY_600_RGB,
  });

  // Date
  page.drawText(data.serviceDate, {
    x: colXs[2] + 8, y: y - 10,
    size: 10, font: fontRegular, color: GRAY_600_RGB,
  });

  // Price
  page.drawText(`${data.amount.toFixed(2)} €`, {
    x: colXs[3] + 8, y: y - 10,
    size: 11, font: fontBold, color: BRAND_PETROL_RGB,
  });

  y -= rowH + 8;

  // ─── Totals ───
  const totalBoxW = 200;
  const totalBoxX = tableX + tableW - totalBoxW;

  // Separator line
  page.drawRectangle({
    x: totalBoxX, y: y + 4,
    width: totalBoxW, height: 1,
    color: GRAY_400_RGB,
  });

  y -= 18;
  // Total HT
  page.drawText('Total HT', { x: totalBoxX + 8, y, size: 10, font: fontRegular, color: GRAY_600_RGB });
  const htText = `${data.amount.toFixed(2)} €`;
  drawRightAligned(htText, y, 10, fontRegular, GRAY_600_RGB);

  y -= 16;
  // TVA
  page.drawText('TVA (0%)', { x: totalBoxX + 8, y, size: 10, font: fontRegular, color: GRAY_600_RGB });
  drawRightAligned('0,00 €', y, 10, fontRegular, GRAY_600_RGB);

  y -= 22;
  // Total TTC box
  page.drawRectangle({
    x: totalBoxX, y: y - 6,
    width: totalBoxW, height: 28,
    color: BRAND_TEAL_RGB,
  });
  page.drawText('TOTAL TTC', { x: totalBoxX + 10, y: y + 2, size: 11, font: fontBold, color: WHITE_RGB });
  const ttcText = `${data.amount.toFixed(2)} €`;
  const ttcW = fontBold.widthOfTextAtSize(ttcText, 12);
  page.drawText(ttcText, { x: metaX - ttcW, y: y + 1, size: 12, font: fontBold, color: WHITE_RGB });

  // ─── Payment info ───
  y -= 50;
  page.drawText('Mode de paiement', { x: 40, y, size: 9, font: fontRegular, color: GRAY_400_RGB });
  y -= 14;
  page.drawText(data.paymentMethod, { x: 40, y, size: 10, font: fontBold, color: BRAND_PETROL_RGB });

  // ─── Legal mentions ───
  y -= 50;
  page.drawRectangle({
    x: 40, y: y - 40,
    width: tableW, height: 50,
    color: LIGHT_BG_RGB,
  });

  page.drawText('TVA non applicable, art. 293 B du CGI', {
    x: 50, y: y - 6,
    size: 9, font: fontRegular, color: GRAY_600_RGB,
  });
  page.drawText('En cas de retard de paiement, une pénalité de 3 fois le taux d\'intérêt légal sera appliquée,', {
    x: 50, y: y - 20,
    size: 8, font: fontRegular, color: GRAY_400_RGB,
  });
  page.drawText('conformément à l\'article L.441-10 du Code de commerce. Indemnité forfaitaire de recouvrement : 40 €.', {
    x: 50, y: y - 32,
    size: 8, font: fontRegular, color: GRAY_400_RGB,
  });

  // ─── Footer ───
  page.drawRectangle({
    x: 0, y: 0,
    width, height: 36,
    color: BRAND_PETROL_RGB,
  });
  const footerText = 'Facture générée par Theralib — theralib.net';
  const footerW = fontRegular.widthOfTextAtSize(footerText, 9);
  page.drawText(footerText, {
    x: (width - footerW) / 2, y: 14,
    size: 9, font: fontRegular, color: GRAY_400_RGB,
  });

  return doc.save();
}
