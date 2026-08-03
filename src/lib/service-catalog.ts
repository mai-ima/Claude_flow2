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
      "「キャンセル手続きの完了」を選択する",
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
      "「サブスクリプションをキャンセル」を選択する",
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

  // ───────── 動画 ─────────
  {
    key: "disney-plus",
    name: "Disney+",
    icon: "play",
    category: "動画",
    cancelUrl: "https://www.disneyplus.com/account/subscription",
    cancelSteps: ["アカウント →「サブスクリプション」を開く", "「解約する」を選択", "確認して解約を確定"],
  },
  {
    key: "unext",
    name: "U-NEXT",
    icon: "play",
    category: "動画",
    cancelUrl: "https://video.unext.jp/account/settings",
    cancelSteps: ["「アカウント・契約」→「契約内容の確認・解約」", "月額プランの「解約」を選択", "解約手続きを完了"],
  },
  {
    key: "hulu-jp",
    name: "Hulu",
    icon: "play",
    category: "動画",
    cancelUrl: "https://www.hulu.jp/account",
    cancelSteps: ["「アカウント」を開く", "「解約する」を選択", "確認して解約を確定"],
  },
  {
    key: "dazn",
    name: "DAZN",
    icon: "play",
    category: "動画",
    cancelUrl: "https://www.dazn.com/account",
    cancelSteps: ["「マイ・アカウント」を開く", "「サブスクリプション」→「退会する」", "退会理由を選び確定"],
  },
  {
    key: "abema-premium",
    name: "ABEMAプレミアム",
    icon: "play",
    category: "動画",
    cancelUrl: "https://abema.tv/account/subscription",
    cancelSteps: ["「アカウント管理」→「プレミアム」", "「解約手続き」を選択", "確認して解約を確定"],
  },
  {
    key: "lemino",
    name: "Lemino",
    icon: "play",
    category: "動画",
    cancelUrl: "https://lemino.docomo.ne.jp/",
    cancelSteps: ["「アカウント」→「契約情報」を開く", "Leminoプレミアムを「解約」", "解約を確定"],
  },
  {
    key: "danime",
    name: "dアニメストア",
    icon: "play",
    category: "動画",
    cancelUrl: "https://anime.dmkt-sp.jp/animestore/CF/about/",
    cancelSteps: ["「メニュー」→「解約」を開く", "注意事項を確認", "「解約する」を確定"],
  },
  {
    key: "crunchyroll",
    name: "Crunchyroll",
    icon: "play",
    category: "動画",
    cancelUrl: "https://www.crunchyroll.com/account/membership",
    cancelSteps: ["アカウント →「Membership」を開く", "「Cancel Membership」を選択", "解約を確定"],
  },

  // ───────── 音楽 ─────────
  {
    key: "amazon-music",
    name: "Amazon Music Unlimited",
    icon: "music",
    category: "音楽",
    cancelUrl: "https://www.amazon.co.jp/music/settings",
    cancelSteps: ["「Amazon Music の設定」を開く", "「Amazon Music Unlimited」→「会員登録をキャンセル」", "解約を確定"],
  },
  {
    key: "youtube-music",
    name: "YouTube Music Premium",
    icon: "music",
    category: "音楽",
    cancelUrl: "https://music.youtube.com/paid_memberships",
    cancelSteps: ["「購入とメンバーシップ」を開く", "「管理」→「解約」", "解約を確定"],
  },
  {
    key: "line-music",
    name: "LINE MUSIC",
    icon: "music",
    category: "音楽",
    cancelUrl: "https://music.line.me/about/plan",
    cancelSteps: ["アプリの「設定」→「プラン」を開く", "「解約する」を選択", "解約を確定"],
  },
  {
    key: "awa",
    name: "AWA",
    icon: "music",
    category: "音楽",
    cancelUrl: "https://award.awa.fm/",
    cancelSteps: ["「設定」→「プラン・お支払い」を開く", "「プランを解約」を選択", "解約を確定"],
  },

  // ───────── ゲーム ─────────
  {
    key: "nintendo-online",
    name: "Nintendo Switch Online",
    icon: "play",
    category: "ゲーム",
    cancelUrl: "https://accounts.nintendo.com/",
    cancelSteps: ["ニンテンドーアカウントの「ショップメニュー」を開く", "「継続購入の管理」→自動更新をオフ", "設定を保存"],
  },
  {
    key: "ps-plus",
    name: "PlayStation Plus",
    icon: "play",
    category: "ゲーム",
    cancelUrl: "https://www.playstation.com/ja-jp/playstation-plus/",
    cancelSteps: ["アカウントの「サブスクリプション」を開く", "PlayStation Plus の「自動更新を解除」", "確認して確定"],
  },
  {
    key: "xbox-gamepass",
    name: "Xbox Game Pass",
    icon: "play",
    category: "ゲーム",
    cancelUrl: "https://account.microsoft.com/services",
    cancelSteps: ["Microsoft アカウントの「サービスとサブスクリプション」を開く", "Game Pass の「管理」→「キャンセル」", "解約を確定"],
  },

  // ───────── ストレージ ─────────
  {
    key: "google-one",
    name: "Google One",
    icon: "cloud",
    category: "ストレージ",
    cancelUrl: "https://one.google.com/settings",
    cancelSteps: ["Google One の「設定」を開く", "「メンバーシップを解約」を選択", "解約を確定"],
  },
  {
    key: "dropbox",
    name: "Dropbox",
    icon: "cloud",
    category: "ストレージ",
    cancelUrl: "https://www.dropbox.com/account/plan",
    cancelSteps: ["「アカウント」→「プラン」を開く", "「プランをキャンセル」を選択", "ダウングレードを確定"],
  },

  // ───────── 仕事効率化 ─────────
  {
    key: "microsoft-365",
    name: "Microsoft 365",
    icon: "briefcase",
    category: "仕事効率化",
    cancelUrl: "https://account.microsoft.com/services",
    cancelSteps: ["「サービスとサブスクリプション」を開く", "Microsoft 365 の「管理」→「キャンセル」", "解約を確定"],
  },
  {
    key: "notion",
    name: "Notion",
    icon: "briefcase",
    category: "仕事効率化",
    cancelUrl: "https://www.notion.so/my-account",
    cancelSteps: ["「Settings」→「Plans」を開く", "「Change plan」→ Free を選択", "解約を確定"],
  },
  {
    key: "canva-pro",
    name: "Canva Pro",
    icon: "sparkles",
    category: "仕事効率化",
    cancelUrl: "https://www.canva.com/settings/billing-and-teams",
    cancelSteps: ["「アカウント設定」→「支払いとプラン」を開く", "「サブスクリプションをキャンセル」を選択", "解約を確定"],
  },
  {
    key: "copilot-pro",
    name: "Microsoft Copilot Pro",
    icon: "sparkles",
    category: "仕事効率化",
    cancelUrl: "https://account.microsoft.com/services",
    cancelSteps: ["「サービスとサブスクリプション」を開く", "Copilot Pro の「管理」→「キャンセル」", "解約を確定"],
  },
  {
    key: "claude-pro",
    name: "Claude Pro",
    icon: "sparkles",
    category: "仕事効率化",
    cancelUrl: "https://claude.ai/settings/billing",
    cancelSteps: ["「Settings」→「Billing」を開く", "「Cancel subscription」を選択", "解約を確定"],
  },
  {
    key: "github-copilot",
    name: "GitHub Copilot",
    icon: "briefcase",
    category: "仕事効率化",
    cancelUrl: "https://github.com/settings/billing",
    cancelSteps: ["「Settings」→「Billing and plans」を開く", "Copilot の「Cancel」を選択", "解約を確定"],
  },
  {
    key: "evernote",
    name: "Evernote",
    icon: "briefcase",
    category: "仕事効率化",
    cancelUrl: "https://www.evernote.com/Settings.action",
    cancelSteps: ["「設定」→「サブスクリプション」を開く", "「自動更新をオフ」または「解約」を選択", "解約を確定"],
  },
  {
    key: "zoom",
    name: "Zoom",
    icon: "briefcase",
    category: "仕事効率化",
    cancelUrl: "https://zoom.us/billing",
    cancelSteps: ["「アカウント管理」→「お支払い」を開く", "プランの「解約」を選択", "解約を確定"],
  },

  // ───────── 学習・ニュース ─────────
  {
    key: "audible",
    name: "Audible",
    icon: "music",
    category: "学習",
    cancelUrl: "https://www.audible.co.jp/account/overview",
    cancelSteps: ["「アカウントサービス」を開く", "「退会手続きへ」を選択", "退会を確定"],
  },
  {
    key: "kindle-unlimited",
    name: "Kindle Unlimited",
    icon: "gift",
    category: "学習",
    cancelUrl: "https://www.amazon.co.jp/kindle-dbs/hz/subscribe/ku",
    cancelSteps: ["「Kindle Unlimited 会員登録の管理」を開く", "「会員資格を終了する」を選択", "終了を確定"],
  },
  {
    key: "duolingo",
    name: "Duolingo Super",
    icon: "gift",
    category: "学習",
    cancelUrl: "https://www.duolingo.com/settings/account",
    cancelSteps: ["Web の「設定」を開く", "サブスクの「解約」を選択", "解約を確定"],
  },
  {
    key: "nikkei",
    name: "日経電子版",
    icon: "chart",
    category: "ニュース",
    cancelUrl: "https://www.nikkei.com/r/account/",
    cancelSteps: ["「登録内容の確認・変更」を開く", "「解約」を選択", "解約を確定"],
  },
  {
    key: "newspicks",
    name: "NewsPicks",
    icon: "chart",
    category: "ニュース",
    cancelUrl: "https://newspicks.com/settings/payment/",
    cancelSteps: ["「設定」→「お支払い情報」を開く", "「解約する」を選択", "解約を確定"],
  },

  // ───────── 生活・その他 ─────────
  {
    key: "x-premium",
    name: "X Premium",
    icon: "sparkles",
    category: "生活",
    cancelUrl: "https://x.com/settings/subscription",
    cancelSteps: ["「設定」→「Premium」を開く", "「サブスクリプションをキャンセル」を選択", "解約を確定"],
  },
  {
    key: "uber-one",
    name: "Uber One",
    icon: "cart",
    category: "生活",
    cancelUrl: "https://www.uber.com/",
    cancelSteps: ["アプリの「アカウント」→「Uber One」を開く", "「メンバーシップを終了」を選択", "終了を確定"],
  },
  {
    key: "line-premium",
    name: "LINEスタンプ プレミアム",
    icon: "heart",
    category: "生活",
    cancelUrl: "https://line.me/",
    cancelSteps: ["LINE の「設定」→「スタンプ」→「プレミアム」", "「解約」を選択", "解約を確定"],
  },
];

export function findService(key: string | null | undefined): CatalogService | undefined {
  if (!key) return undefined;
  return SERVICE_CATALOG.find((s) => s.key === key);
}
