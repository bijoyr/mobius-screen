import { NextResponse } from "next/server";
import { listIntlUniverse, replaceIntlUniverse } from "@/lib/db";
import { parseUniverseCsv } from "@/lib/csv";
import { parseUniverseXlsx } from "@/lib/spreadsheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stocks = await listIntlUniverse();
  return NextResponse.json({ count: stocks.length, stocks });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field in form data" },
      { status: 400 },
    );
  }

  const name = (file.name ?? "").toLowerCase();
  const isXlsx =
    name.endsWith(".xlsx") ||
    name.endsWith(".xlsm") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  let parsed;
  try {
    if (isXlsx) {
      const buf = await file.arrayBuffer();
      parsed = await parseUniverseXlsx(buf);
    } else {
      const text = await file.text();
      parsed = parseUniverseCsv(text);
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Failed to parse uploaded file: ${err instanceof Error ? err.message : "unknown error"}`,
      },
      { status: 400 },
    );
  }

  if (parsed.rows.length === 0) {
    return NextResponse.json(
      {
        error:
          "No valid rows in uploaded file. The header must include 'symbol' and 'yahooSymbol' columns.",
        errors: parsed.errors,
      },
      { status: 400 },
    );
  }

  const count = await replaceIntlUniverse(parsed.rows);
  return NextResponse.json({
    count,
    accepted: parsed.rows.length,
    errors: parsed.errors,
  });
}
