import "server-only";
import { db } from "@/lib/db";
import { parseDateInput } from "@/lib/date";
import { Currency } from "@/lib/enums";

/** ごく軽量な CSV パーサ（ダブルクォート + "" エスケープ対応）。 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

/**
 * 家計簿 CSV を取り込む。エクスポート形式
 * （日付, 種別, 金額, 通貨, カテゴリ, 支払い方法, メモ）に対応。
 * カテゴリ/支払い方法は名前で既存と照合（無ければ未設定）。
 */
/** 1度に取り込める最大行数。 */
const MAX_IMPORT_ROWS = 5000;

/**
 * 通貨コードを検証する。未知の値をそのまま保存すると、表示時に
 * Intl.NumberFormat が RangeError を投げて画面が壊れる。
 */
function normalizeCurrency(value: string): string {
  const parsed = Currency.safeParse((value || "").trim().toUpperCase());
  return parsed.success ? parsed.data : "JPY";
}

export async function importTransactionsCsv(
  ledgerId: string,
  userId: string,
  csv: string,
): Promise<ImportResult> {
  const rows = parseCsv(csv);
  if (rows.length === 0) return { created: 0, skipped: 0, errors: ["データがありません。"] };
  // 1回の取り込み件数に上限を設ける（無制限だと1リクエストで大量書き込みできる）。
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      created: 0,
      skipped: 0,
      errors: [`1度に取り込めるのは${MAX_IMPORT_ROWS.toLocaleString()}行までです。期間を分けてお試しください。`],
    };
  }

  // 先頭行がヘッダーらしければ除外
  const first = rows[0]?.[0]?.trim() ?? "";
  const dataRows = /日付|date/i.test(first) ? rows.slice(1) : rows;

  const [categories, methods] = await Promise.all([
    db.category.findMany({ where: { ledgerId } }),
    db.paymentMethod.findMany({ where: { ledgerId } }),
  ]);
  const catByName = new Map(categories.map((c) => [c.name, c.id]));
  const pmByName = new Map(methods.map((m) => [m.name, m.id]));

  const toCreate: {
    ledgerId: string;
    createdByUserId: string;
    type: string;
    amount: number;
    currency: string;
    occurredAt: Date;
    categoryId: string | null;
    paymentMethodId: string | null;
    memo: string | null;
  }[] = [];
  const errors: string[] = [];
  let skipped = 0;

  dataRows.forEach((cols, idx) => {
    const [dateStr, typeStr, amountStr, currencyStr, catName, pmName, memo] = cols.map((c) =>
      (c ?? "").trim(),
    );
    const date = parseDateInput(dateStr);
    const amount = parseInt((amountStr || "").replace(/[^\d-]/g, ""), 10);
    const type = typeStr === "収入" || typeStr.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";

    if (isNaN(date.getTime()) || !amount || amount <= 0) {
      skipped++;
      if (errors.length < 5) errors.push(`${idx + 1}行目: 日付か金額が不正です。`);
      return;
    }
    toCreate.push({
      ledgerId,
      createdByUserId: userId,
      type,
      amount,
      currency: normalizeCurrency(currencyStr),
      occurredAt: date,
      categoryId: catName ? (catByName.get(catName) ?? null) : null,
      paymentMethodId: pmName ? (pmByName.get(pmName) ?? null) : null,
      memo: memo || null,
    });
  });

  if (toCreate.length > 0) {
    await db.transaction.createMany({ data: toCreate });
  }
  return { created: toCreate.length, skipped, errors };
}
