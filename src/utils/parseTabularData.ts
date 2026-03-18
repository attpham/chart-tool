import { ChartData } from '../types/chart';

export interface ParseResult {
  data: ChartData;
  error?: string;
}

function detectDelimiter(text: string): '\t' | ',' {
  const firstLine = text.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  // Prefer comma (more common) when counts are equal; only use tab when it is strictly more frequent
  return tabCount > commaCount ? '\t' : ',';
}

/** Split a single line respecting quoted fields (CSV only). */
function splitLine(line: string, delimiter: '\t' | ','): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map(c => c.trim());
  }
  // Handle quoted CSV fields
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse a cell string into a number or null. */
function parseCell(cell: string): number | null {
  const trimmed = cell.trim();
  if (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'na'
  ) {
    return null;
  }
  // Strip currency symbols, percent signs (anywhere), and thousands separators
  const cleaned = trimmed
    .replace(/[$€£¥₹]/g, '')
    .replace(/%/g, '')
    .replace(/,/g, '')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse tab-separated or comma-separated tabular text into a ChartData object.
 * Assumes the first row is headers (dataset labels) and the first column is
 * category labels (row labels).
 */
export function parseTabularText(text: string): ParseResult {
  try {
    const delimiter = detectDelimiter(text);
    const rawLines = text.split(/\r?\n/);

    // Drop trailing empty lines
    while (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
      rawLines.pop();
    }

    if (rawLines.length < 2) {
      return {
        data: { labels: [], datasets: [] },
        error: 'Not enough rows — need at least a header row and one data row.',
      };
    }

    const rows = rawLines.map(line => splitLine(line, delimiter));
    const maxCols = Math.max(...rows.map(r => r.length));

    // Normalize all rows to the same width
    const normalized = rows.map(r => {
      while (r.length < maxCols) r.push('');
      return r;
    });

    const headerRow = normalized[0];
    const dataRows = normalized.slice(1);

    // Row labels come from the first column (skip header cell)
    const labels = dataRows.map(row => row[0] ?? '');

    // Dataset columns start at index 1
    const datasetCount = headerRow.length - 1;
    if (datasetCount < 1) {
      return {
        data: { labels: [], datasets: [] },
        error: 'Need at least two columns (labels + one dataset).',
      };
    }

    const datasets = Array.from({ length: datasetCount }, (_, di) => ({
      label: headerRow[di + 1] || `Dataset ${di + 1}`,
      data: dataRows.map(row => parseCell(row[di + 1] ?? '')),
    }));

    return { data: { labels, datasets } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { data: { labels: [], datasets: [] }, error: `Parse error: ${msg}` };
  }
}

/**
 * Read a File object and parse its contents as tabular data.
 */
export async function parseTabularFile(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        resolve({ data: { labels: [], datasets: [] }, error: 'Could not read file.' });
        return;
      }
      resolve(parseTabularText(text));
    };
    reader.onerror = () => {
      resolve({ data: { labels: [], datasets: [] }, error: 'File read error.' });
    };
    reader.readAsText(file);
  });
}
