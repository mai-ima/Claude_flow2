/**
 * 家計の健康度。
 *
 * 判定は全てここに書いたルールだけで行う。外部には何も送らないし、
 * 学習も推測もしない（そういう作りにすると、なぜその点数なのかを
 * 利用者に説明できなくなる）。
 *
 * 出すのは点数だけではなく、必ず内訳と「なぜそう言えるか」を一緒に返す。
 * 「72点です」とだけ言われても、何を直せばよいか分からない。
 */

export interface HealthInput {
  /** 対象月の収入。 */
  income: number;
  /** 対象月の支出。 */
  expense: number;
  /** 月の予算（全体）。決めていなければ null。 */
  budget: number | null;
  /** サブスクの月額合計。 */
  subscriptionMonthly: number;
  /** 対象月に記録した件数。 */
  transactionCount: number;
  /** 対象月の日数のうち、何日ぶんの記録があるか。 */
  recordedDays: number;
  /** 対象月の日数（進行中の月なら今日まで）。 */
  daysInMonth: number;
}

export type Level = "good" | "fair" | "poor" | "unknown";

export interface HealthFactor {
  key: "savings" | "budget" | "fixed" | "habit";
  label: string;
  /** 0〜25。判定できないときは null（点数に数えない）。 */
  score: number | null;
  /** 満点。 */
  max: number;
  level: Level;
  /** 何をどう測ってその点数にしたか。 */
  evidence: string;
  /** 上げるための具体策。判定できないときは「まず何を入れるか」。 */
  advice: string;
}

export interface HealthScore {
  /** 0〜100。判定できた項目だけで割り戻す。 */
  score: number;
  level: Level;
  factors: HealthFactor[];
  /** 判定に使えた項目の数。少ないほど点数の確からしさは落ちる。 */
  measured: number;
}

const MAX = 25;

/** 点数から3段階へ。境目は満点の 70% と 40%。 */
function levelOf(score: number, max: number): Level {
  const ratio = score / max;
  if (ratio >= 0.7) return "good";
  if (ratio >= 0.4) return "fair";
  return "poor";
}

/** 0〜max の範囲に収める。 */
const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

/**
 * 貯蓄率での評価。
 * 20% 貯められていれば満点。0% で 0点。使いすぎの月は 0点。
 */
function savingsFactor(income: number, expense: number): HealthFactor {
  if (income <= 0) {
    return {
      key: "savings",
      label: "貯蓄率",
      score: null,
      max: MAX,
      level: "unknown",
      evidence: "この月の収入の記録がないため、貯蓄率を出せません。",
      advice: "給与などの収入も記録すると、収入のうち何割を残せたかが出せます。",
    };
  }
  const rate = ((income - expense) / income) * 100;
  const score = clamp(Math.round((rate / 20) * MAX), MAX);
  return {
    key: "savings",
    label: "貯蓄率",
    score,
    max: MAX,
    level: levelOf(score, MAX),
    evidence: `収入 ${income.toLocaleString()}円 のうち ${Math.round(rate)}% が残りました（満点は20%）。`,
    advice:
      rate >= 20
        ? "この調子で続けてください。"
        : "支出のうち大きいものから見直すと、率が上がりやすくなります。",
  };
}

/**
 * 予算の守り具合での評価。
 * 予算ちょうどか下回っていれば満点。超えた割合に応じて減らす。
 */
function budgetFactor(budget: number | null, expense: number): HealthFactor {
  if (budget === null || budget <= 0) {
    return {
      key: "budget",
      label: "予算どおりか",
      score: null,
      max: MAX,
      level: "unknown",
      evidence: "全体の予算を決めていないため、守れているかを判定できません。",
      advice: "予算の画面から、月にいくらまで使うかを決められます。",
    };
  }
  const over = (expense - budget) / budget;
  // 予算ちょうどで満点。50% 超過で 0点。
  const score = clamp(Math.round(MAX * (1 - Math.max(0, over) / 0.5)), MAX);
  return {
    key: "budget",
    label: "予算どおりか",
    score,
    max: MAX,
    level: levelOf(score, MAX),
    evidence:
      expense <= budget
        ? `予算 ${budget.toLocaleString()}円 に対して ${expense.toLocaleString()}円 で収まりました。`
        : `予算 ${budget.toLocaleString()}円 に対して ${expense.toLocaleString()}円 で、${Math.round(over * 100)}% 超えています。`,
    advice:
      expense <= budget
        ? "予算内で収まっています。"
        : "予算が実態と合っていないこともあります。金額を見直すか、使う先を絞ってください。",
  };
}

/**
 * 固定費の重さでの評価。
 * サブスクの月額が支出の 10% 以内なら満点、30% で 0点。
 */
function fixedFactor(subscriptionMonthly: number, expense: number): HealthFactor {
  if (expense <= 0) {
    return {
      key: "fixed",
      label: "固定費の重さ",
      score: null,
      max: MAX,
      level: "unknown",
      evidence: "この月の支出の記録がないため、割合を出せません。",
      advice: "支出を記録すると、そのうち固定費がどれだけかを出せます。",
    };
  }
  const ratio = subscriptionMonthly / expense;
  const score = clamp(Math.round(MAX * (1 - (Math.max(0, ratio) - 0.1) / 0.2)), MAX);
  return {
    key: "fixed",
    label: "固定費の重さ",
    score,
    max: MAX,
    level: levelOf(score, MAX),
    evidence:
      `支出 ${expense.toLocaleString()}円 のうち、サブスクが ` +
      `${subscriptionMonthly.toLocaleString()}円（${Math.round(ratio * 100)}%）です（満点は10%以内）。`,
    advice:
      ratio <= 0.1
        ? "固定費は軽めです。"
        : "サブスクの画面で、使っていないものがないか見直せます。",
  };
}

/**
 * 記録の続き方での評価。
 * 日数のうち何日つけたか。半分つけていれば満点にする。
 * 毎日つけることを求めると、まとめて入力する人が不当に低くなる。
 */
function habitFactor(
  recordedDays: number,
  daysInMonth: number,
  transactionCount: number,
): HealthFactor {
  if (daysInMonth <= 0 || transactionCount <= 0) {
    return {
      key: "habit",
      label: "記録の続き方",
      score: null,
      max: MAX,
      level: "unknown",
      evidence: "この月の記録がまだありません。",
      advice: "1件つけると、ここも判定できるようになります。",
    };
  }
  // 先の日付の記録が混ざると、分子が分母を超えて「1日のうち6日」のような
  // 文になる。数える側でも今日までに絞っているが、ここでも丸めておく。
  const days = Math.min(recordedDays, daysInMonth);
  const ratio = days / daysInMonth;
  const score = clamp(Math.round((ratio / 0.5) * MAX), MAX);
  return {
    key: "habit",
    label: "記録の続き方",
    score,
    max: MAX,
    level: levelOf(score, MAX),
    evidence: `${daysInMonth}日のうち ${days}日 に記録があります（満点は半分の日数）。`,
    advice:
      ratio >= 0.5
        ? "よく続いています。"
        : "使ったその場でつけると続きやすくなります。ホームの「記録する」から入れられます。",
  };
}

/**
 * 家計の健康度をまとめて出す。
 *
 * 判定できない項目は分母から外す。データが無いことを「悪い」と見なすと、
 * 使い始めた人の点数が不当に低くなる。
 */
export function healthScore(input: HealthInput): HealthScore {
  const factors: HealthFactor[] = [
    savingsFactor(input.income, input.expense),
    budgetFactor(input.budget, input.expense),
    fixedFactor(input.subscriptionMonthly, input.expense),
    habitFactor(input.recordedDays, input.daysInMonth, input.transactionCount),
  ];

  const measured = factors.filter((f) => f.score !== null);
  if (measured.length === 0) {
    return { score: 0, level: "unknown", factors, measured: 0 };
  }

  const got = measured.reduce((s, f) => s + (f.score ?? 0), 0);
  const max = measured.reduce((s, f) => s + f.max, 0);
  const score = Math.round((got / max) * 100);

  return { score, level: levelOf(score, 100), factors, measured: measured.length };
}

export const LEVEL_LABEL: Record<Level, string> = {
  good: "良好",
  fair: "ふつう",
  poor: "見直したい",
  unknown: "判定できません",
};
