export interface ParsedUniverseRow {
  symbol: string;
  yahooSymbol: string;
  name?: string;
  exchange?: string;
  sector?: string;
}

export interface ParsedUniverseResult {
  rows: ParsedUniverseRow[];
  errors: Array<{ line: number; reason: string }>;
}

const SYMBOL_ALIASES = ["symbol", "ticker"];
const YAHOO_ALIASES = ["yahoosymbol", "yahoo_symbol", "yahoo", "yahooticker"];
const NAME_ALIASES = ["name", "company", "title"];
const EXCHANGE_ALIASES = ["exchange", "venue", "market"];
const SECTOR_ALIASES = ["sector", "industry"];

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"' && cur.length === 0) {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function splitRows(text: string): string[] {
  // Handle quoted fields with embedded newlines. Walk char by char.
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      cur += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      rows.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.length) rows.push(cur);
  return rows;
}

function findHeader(header: string[], aliases: string[]): number {
  const normalised = header.map((h) => h.toLowerCase().replace(/\s+/g, ""));
  for (const a of aliases) {
    const i = normalised.indexOf(a);
    if (i !== -1) return i;
  }
  return -1;
}

export function parseUniverseCsv(text: string): ParsedUniverseResult {
  const rows = splitRows(text);
  const errors: ParsedUniverseResult["errors"] = [];
  const out: ParsedUniverseRow[] = [];

  if (rows.length === 0 || rows.every((r) => r.trim() === "")) {
    return { rows: [], errors: [{ line: 0, reason: "File is empty" }] };
  }

  let headerLine = 0;
  while (headerLine < rows.length && rows[headerLine].trim() === "") {
    headerLine++;
  }
  const header = parseLine(rows[headerLine]);

  const idxSymbol = findHeader(header, SYMBOL_ALIASES);
  const idxYahoo = findHeader(header, YAHOO_ALIASES);
  if (idxSymbol === -1 || idxYahoo === -1) {
    return {
      rows: [],
      errors: [
        {
          line: headerLine + 1,
          reason: `Header must include both \"symbol\" and \"yahooSymbol\" columns. Got: ${header.join(", ")}`,
        },
      ],
    };
  }
  const idxName = findHeader(header, NAME_ALIASES);
  const idxExchange = findHeader(header, EXCHANGE_ALIASES);
  const idxSector = findHeader(header, SECTOR_ALIASES);

  const seen = new Set<string>();
  for (let i = headerLine + 1; i < rows.length; i++) {
    const line = rows[i];
    if (line.trim() === "") continue;
    const cells = parseLine(line);
    const symbolRaw = (cells[idxSymbol] ?? "").trim();
    const yahooRaw = (cells[idxYahoo] ?? "").trim();
    if (!symbolRaw && !yahooRaw) continue;
    if (!symbolRaw) {
      errors.push({ line: i + 1, reason: "Missing symbol" });
      continue;
    }
    if (!yahooRaw) {
      errors.push({ line: i + 1, reason: `Missing yahooSymbol for ${symbolRaw}` });
      continue;
    }
    const symbol = symbolRaw.toUpperCase();
    if (seen.has(symbol)) {
      errors.push({ line: i + 1, reason: `Duplicate symbol ${symbol}` });
      continue;
    }
    seen.add(symbol);
    out.push({
      symbol,
      yahooSymbol: yahooRaw,
      name: idxName !== -1 ? cells[idxName]?.trim() || undefined : undefined,
      exchange:
        idxExchange !== -1 ? cells[idxExchange]?.trim() || undefined : undefined,
      sector: idxSector !== -1 ? cells[idxSector]?.trim() || undefined : undefined,
    });
  }

  return { rows: out, errors };
}
