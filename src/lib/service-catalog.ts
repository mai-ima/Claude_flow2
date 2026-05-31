/**
 * 主要サブスクのカタログ。スマート解約アシストの解約直リンクと、
 * 登録時のオートコンプリート（既定アイコン/カテゴリ）に利用する。
 */
export interface CatalogService {
  key: string;
  name: string;
  /** components/icons の brand アイコンキー */
  icon: string;
  category: string;
  cancelUrl: string;
  /** 解約手順のミニマルなステップ */
  cancelSteps: string[];
}

export const SERVICE_CATALOG: CatalogService[] = [
  {
    key: "netflix",
    name: "Netflix",
    icon: "play",
    category: "娯楽",
    cancelUrl: "https://www.netflix.com/cancelplan",
    cancelSteps: [
      "Netflix にログイン",
      "「アカウント」→「メンバーシップのキャンセル」を開く",
      "「キャンセル手続きの完了」を押す",
    ],
  },
  {
    key: "spotify",
    name: "Spotify",
    icon: "music",
    category: "娯楽",
    cancelUrl: "https://www.spotify.com/jp/account/subscription/",
    cancelSteps: [
      "Spotify の「アカウント」→「利用可能なプラン」を開く",
      "Premium を「キャンセル」",
      "確認画面で解約を確定",
    ],
  },
  {
    key: "amazon-prime",
    name: "Amazon Prime",
    icon: "cart",
    category: "ショッピング",
    cancelUrl: "https://www.amazon.co.jp/amazonprime",
    cancelSteps: [
      "Amazon の「アカウント」→「プライム会員情報」を開く",
      "「会員資格を終了する」を選択",
      "特典終了を確認して確定",
    ],
  },
  {
    key: "youtube-premium",
    name: "YouTube Premium",
    icon: "play",
    category: "娯楽",
    cancelUrl: "https://www.youtube.com/paid_memberships",
    cancelSteps: [
      "YouTube の「購入とメンバーシップ」を開く",
      "YouTube Premium の「管理」→「解約」",
      "理由を選び解約を確定",
    ],
  },
  {
    key: "apple-music",
    name: "Apple Music",
    icon: "music",
    category: "娯楽",
    cancelUrl: "https://music.apple.com/account/subscriptions",
    cancelSteps: [
      "「設定」→ 自分の名前 →「サブスクリプション」",
      "Apple Music を選択",
      "「サブスクリプションをキャンセル」を押す",
    ],
  },
  {
    key: "icloud",
    name: "iCloud+",
    icon: "cloud",
    category: "ユーティリティ",
    cancelUrl: "https://support.apple.com/ja-jp/HT207594",
    cancelSteps: [
      "「設定」→ 自分の名前 →「iCloud」→「ストレージを管理」",
      "「ストレージプランを変更」→「ダウングレード」",
      "無料プランを選択して確定",
    ],
  },
  {
    key: "chatgpt",
    name: "ChatGPT Plus",
    icon: "sparkles",
    category: "仕事効率化",
    cancelUrl: "https://chatgpt.com/#settings/Subscription",
    cancelSteps: [
      "設定 →「Subscription」を開く",
      "「Manage」→「Cancel plan」",
      "解約を確定",
    ],
  },
  {
    key: "adobe-cc",
    name: "Adobe Creative Cloud",
    icon: "sparkles",
    category: "仕事効率化",
    cancelUrl: "https://account.adobe.com/plans",
    cancelSteps: [
      "Adobe アカウントの「プラン」を開く",
      "「プランを管理」→「プランを解約」",
      "解約手続きを完了",
    ],
  },
];

export function findService(key: string | null | undefined): CatalogService | undefined {
  if (!key) return undefined;
  return SERVICE_CATALOG.find((s) => s.key === key);
}
