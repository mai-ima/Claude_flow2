/**
 * ベータ機能の登録簿。
 *
 * 親スイッチ(User.betaOptIn)と、機能ごとの個別スイッチ(User.betaFeatures)の
 * 2段構えで扱う。親がオフなら個別の設定に関わらず全て無効。
 *
 * 純関数のみ。server / client のどちらからも import できるよう
 * "use client" を付けず、DB にも触れない。
 */

export const BETA_FEATURES = [
  {
    key: "amount_pad",
    label: "電卓キーパッド",
    description: "記録の入力画面で、金額をキーパッドと計算式で入れられます。",
  },
  {
    key: "swipe_duplicate",
    label: "スワイプで複製",
    description: "取引を左スワイプして、同じ内容を今日の記録として追加できます。",
  },
  {
    key: "haptics",
    label: "操作の触覚フィードバック",
    description: "ボタン操作に短い振動が返ります（対応端末のみ）。",
  },
  {
    key: "today_allowance",
    label: "今日あといくら使えるか",
    description: "ダッシュボードに、予算の残りを日割りした金額を表示します。",
  },
  {
    key: "keyboard_shortcuts",
    label: "キーボードショートカット",
    description: "n で記録、s でサブスク、g のあとにキーで各ページへ移動します。",
  },
  {
    key: "budget_formula",
    label: "予算の数式入力",
    description: "予算額の欄で ＋ − × ÷ を使った計算ができます。",
  },
] as const;

export type BetaFeatureKey = (typeof BETA_FEATURES)[number]["key"];

const ALL_KEYS: readonly string[] = BETA_FEATURES.map((f) => f.key);

export function isBetaFeatureKey(v: unknown): v is BetaFeatureKey {
  return typeof v === "string" && ALL_KEYS.includes(v);
}

/**
 * DB の Json 列を読み取り可能なキー集合へ。
 * null / 未設定は「未指定」を意味し、ここでは null を返す（呼び出し側で全有効に倒す）。
 */
export function parseBetaFeatures(raw: unknown): BetaFeatureKey[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.filter(isBetaFeatureKey);
}

export interface BetaState {
  /** 親スイッチ。false なら全機能オフ。 */
  optIn: boolean;
  /** 個別に有効化したキー。null は「未指定」= 親スイッチに従って全て有効。 */
  features: BetaFeatureKey[] | null;
}

/**
 * 個別機能が有効かどうか。
 *
 * 親スイッチをオンにしただけの既存ユーザー（features が未設定）は、
 * これまで通り全機能が使える状態を保つ。
 */
export function isBetaEnabled(state: BetaState, key: BetaFeatureKey): boolean {
  if (!state.optIn) return false;
  if (state.features === null) return true;
  return state.features.includes(key);
}

/** 現在有効なキーの一覧。UI の初期表示に使う。 */
export function enabledBetaFeatures(state: BetaState): BetaFeatureKey[] {
  if (!state.optIn) return [];
  return state.features === null ? [...ALL_KEYS] as BetaFeatureKey[] : state.features;
}
