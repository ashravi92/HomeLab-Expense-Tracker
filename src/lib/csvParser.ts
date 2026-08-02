import { CSVMapping } from '../types';

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
  suggestedMapping: CSVMapping;
}

export class CSVParser {
  /**
   * Simple, reliable browser CSV parser with quotes handling
   */
  static parse(csvText: string): ParsedCSV {
    const lines = csvText
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      return {
        headers: [],
        rows: [],
        suggestedMapping: CSVParser.getEmptyMapping(),
      };
    }

    const headers = CSVParser.parseCSVLine(lines[0]);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = CSVParser.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const rowObj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        rowObj[header] = values[idx] !== undefined ? values[idx].trim() : '';
      });

      // Filter out empty rows
      if (Object.values(rowObj).some((val) => val.length > 0)) {
        rows.push(rowObj);
      }
    }

    const suggestedMapping = CSVParser.detectMapping(headers);

    return {
      headers,
      rows,
      suggestedMapping,
    };
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === ';') && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private static getEmptyMapping(): CSVMapping {
    return {
      dateColumn: '',
      amountColumn: '',
      descriptionColumn: '',
      merchantColumn: '',
      categoryColumn: '',
      paymentMethodColumn: '',
      amountType: 'single_signed',
      outflowColumn: '',
      inflowColumn: '',
      dateFormat: 'auto',
    };
  }

  /**
   * Auto-detect header column names by fuzzy keywords
   */
  public static detectMapping(headers: string[]): CSVMapping {
    const mapping = CSVParser.getEmptyMapping();

    headers.forEach((h) => {
      const norm = h.toLowerCase().trim();

      // Date
      if (!mapping.dateColumn && (norm.includes('date') || norm.includes('time') || norm === 'posted')) {
        mapping.dateColumn = h;
      }

      // Amount
      if (!mapping.amountColumn && (norm === 'amount' || norm === 'amt' || norm.includes('transaction amount'))) {
        mapping.amountColumn = h;
      }

      // Outflow / Debit
      if (norm.includes('debit') || norm.includes('outflow') || norm.includes('expense') || norm.includes('withdraw')) {
        mapping.outflowColumn = h;
        mapping.amountType = 'separate_columns';
      }

      // Inflow / Credit
      if (norm.includes('credit') || norm.includes('inflow') || norm.includes('income') || norm.includes('deposit')) {
        mapping.inflowColumn = h;
        mapping.amountType = 'separate_columns';
      }

      // Description / Memo
      if (!mapping.descriptionColumn && (norm.includes('desc') || norm.includes('memo') || norm.includes('detail') || norm === 'name' || norm === 'title')) {
        mapping.descriptionColumn = h;
      }

      // Merchant / Payee
      if (!mapping.merchantColumn && (norm.includes('merchant') || norm.includes('payee') || norm.includes('vendor'))) {
        mapping.merchantColumn = h;
      }

      // Category
      if (!mapping.categoryColumn && norm.includes('category')) {
        mapping.categoryColumn = h;
      }

      // Payment Method
      if (!mapping.paymentMethodColumn && (norm.includes('account') || norm.includes('card') || norm.includes('method') || norm.includes('type'))) {
        mapping.paymentMethodColumn = h;
      }
    });

    if (!mapping.descriptionColumn && headers.length > 1) {
      mapping.descriptionColumn = headers[1] || headers[0];
    }
    if (!mapping.dateColumn && headers.length > 0) {
      mapping.dateColumn = headers[0];
    }

    return mapping;
  }

  /**
   * Robust Date parser converting various formats to YYYY-MM-DD ISO string
   */
  public static parseFlexibleDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    const clean = dateStr.trim().replace(/['"]/g, '');

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      return clean;
    }

    // MM/DD/YYYY or DD/MM/YYYY or M/D/YY
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map((p) => parseInt(p, 10));

      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        // Handle 2-digit year
        if (p3 < 100) p3 += 2000;

        let year = p3;
        let month = p1;
        let day = p2;

        // If p1 > 12, assume DD/MM/YYYY
        if (p1 > 12 && p2 <= 12) {
          day = p1;
          month = p2;
        }

        const yyyy = String(year).padStart(4, '0');
        const mm = String(Math.min(12, Math.max(1, month))).padStart(2, '0');
        const dd = String(Math.min(31, Math.max(1, day))).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    }

    // Try Standard JS Date parse fallback
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  }
}
