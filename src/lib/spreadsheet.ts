import ExcelJS from "exceljs";
import { parseUniverseCsv, type ParsedUniverseResult } from "./csv";

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink;
    }
  }
  return "";
}

function escapeCsv(s: string): string {
  if (s.includes(",") || s.includes("\"") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function parseUniverseXlsx(
  buffer: ArrayBuffer,
): Promise<ParsedUniverseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) {
    return { rows: [], errors: [{ line: 0, reason: "Workbook has no sheets" }] };
  }

  const lines: string[] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    const max = row.cellCount;
    for (let c = 1; c <= max; c++) {
      cells.push(escapeCsv(cellToString(row.getCell(c).value)));
    }
    lines.push(cells.join(","));
  });

  return parseUniverseCsv(lines.join("\n"));
}
