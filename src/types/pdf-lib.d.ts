declare module 'pdf-lib' {
  export function rgb(r: number, g: number, b: number): { type: string; red: number; green: number; blue: number };

  export enum StandardFonts {
    Courier = 'Courier',
    CourierBold = 'Courier-Bold',
    CourierBoldOblique = 'Courier-BoldOblique',
    CourierOblique = 'Courier-Oblique',
    Helvetica = 'Helvetica',
    HelveticaBold = 'Helvetica-Bold',
    HelveticaBoldOblique = 'Helvetica-BoldOblique',
    HelveticaOblique = 'Helvetica-Oblique',
    TimesRoman = 'Times-Roman',
    TimesRomanBold = 'Times-Bold',
    TimesRomanBoldItalic = 'Times-BoldItalic',
    TimesRomanItalic = 'Times-Italic',
    Symbol = 'Symbol',
    ZapfDingbats = 'ZapfDingbats',
  }

  interface PDFFont {
    widthOfTextAtSize(text: string, size: number): number;
  }

  interface PDFPage {
    getSize(): { width: number; height: number };
    drawText(text: string, options?: {
      x?: number;
      y?: number;
      size?: number;
      font?: PDFFont;
      color?: ReturnType<typeof rgb>;
    }): void;
    drawRectangle(options?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      color?: ReturnType<typeof rgb>;
    }): void;
  }

  interface PDFDocument {
    addPage(size?: [number, number]): PDFPage;
    embedFont(font: StandardFonts): Promise<PDFFont>;
    save(): Promise<Uint8Array>;
  }

  export const PDFDocument: {
    create(): Promise<PDFDocument>;
  };
}
