import { ActivityRing } from "@/components/ui/activity-ring";
import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  PlayIcon,
  UsersIcon,
  CardIcon,
  CategoryIcon,
  RepeatIcon,
  TargetIcon,
  HomeIcon,
  CalendarIcon,
  ChartIcon,
} from "@/components/icons";
import { formatMoney } from "@/lib/money";

/** 機能紹介用の、実UIを模した軽量モック（純表示・絵文字なし）。 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[28px] border border-border-subtle bg-surface-0 p-4 shadow-md">
      <div className="min-w-0 rounded-[20px] bg-surface-1 p-4">{children}</div>
    </div>
  );
}

function CostTimeMock() {
  return (
    <Frame>
      <div className="flex items-center gap-5">
        <ActivityRing
          size={120}
          thickness={12}
          tracks={[
            { value: 1, color: "var(--color-income)" },
            { value: 0.58, color: "var(--color-expense)" },
          ]}
        >
          <div className="text-center">
            <div className="text-[10px] text-text-tertiary">使った時間</div>
            <div className="text-[15px] font-bold">92時間</div>
          </div>
        </ActivityRing>
        <div className="flex-1 space-y-2 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-income" />稼いだ時間
            </span>
            <span className="font-semibold tabular-nums">160時間</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-expense" />使った時間
            </span>
            <span className="font-semibold tabular-nums">92時間</span>
          </div>
          <p className="text-[11px] leading-relaxed text-text-tertiary">
            月980円のサブスク ≒ 人生の30分
          </p>
        </div>
      </div>
    </Frame>
  );
}

const STACK_CARD = {
  name: "楽天カード",
  grad: "from-[#ff2d55] to-[#ff6482]",
  total: 8590,
  subs: [
    { icon: "play", name: "Netflix", label: "1,490円/月" },
    { icon: "music", name: "Spotify", label: "980円/月" },
    { icon: "cloud", name: "iCloud+", label: "400円/月" },
  ],
};

function StackMock() {
  return (
    <Frame>
      <div className="relative">
        <div className={`rounded-2xl bg-gradient-to-br ${STACK_CARD.grad} p-5 text-white shadow-md`}>
          <div className="flex items-center justify-between">
            <CardIcon size={24} />
            <span className="text-[13px] opacity-80">月額</span>
          </div>
          <div className="mt-6 text-[15px] font-medium">{STACK_CARD.name}</div>
          <div className="text-[22px] font-bold tabular-nums">{formatMoney(STACK_CARD.total)}</div>
        </div>
        <div className="mx-3 -mt-2 rounded-b-2xl border border-t-0 border-border-subtle bg-surface-1 px-4 pb-3 pt-4">
          {STACK_CARD.subs.map((s) => (
            <div
              key={s.name}
              className="flex items-center gap-2.5 border-t border-border-subtle py-2 text-[14px] first:border-t-0"
            >
              <CategoryIcon name={s.icon} size={18} className="text-text-secondary" />
              <span className="flex-1 truncate">{s.name}</span>
              <span className="tabular-nums text-text-tertiary">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function ReviewMock() {
  return (
    <Frame>
      <div className="rounded-2xl border border-border-subtle bg-surface-1 p-5 shadow-sm">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent">
          <PlayIcon size={24} />
        </div>
        <div className="mt-3 text-[18px] font-bold tracking-tight">Netflix</div>
        <div className="mt-2 space-y-1 text-[12px] text-text-secondary">
          <div>年間 <b className="text-text-primary">{formatMoney(17880)}</b> 支払い</div>
          <div>最終利用から <b className="text-warning">45日</b></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-surface-2 py-2 text-center text-[13px] font-medium">必要</div>
          <div className="rounded-xl bg-expense py-2 text-center text-[13px] font-medium text-white">
            見直す
          </div>
        </div>
      </div>
    </Frame>
  );
}

const MEMBERS = [
  { name: "たろう", amount: 4960, role: "オーナー" },
  { name: "はなこ", amount: 3470, role: "編集可" },
];

function FamilyMock() {
  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-text-tertiary">共有帳簿のサブスク</span>
        <Badge tone="pod" size="sm">2人</Badge>
      </div>
      <div className="space-y-2">
        {MEMBERS.map((m) => (
          <div key={m.name} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="tap-target grid h-8 w-8 place-items-center rounded-full bg-pod/12 text-pod">
              <UsersIcon size={16} />
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium">{m.name}</span>
              <span className="block text-[11px] text-text-tertiary">{m.role}</span>
            </span>
            <span className="text-[13px] font-semibold tabular-nums">{formatMoney(m.amount)}/月</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3 pt-1 text-[12px]">
          <CheckIcon size={14} className="text-success" />
          <span className="text-text-tertiary">重複契約なし</span>
        </div>
      </div>
    </Frame>
  );
}

const AUTOMATION_ROWS = [
  { icon: <HomeIcon size={16} />, name: "家賃", note: "毎月25日 ・ 定期", amount: "−85,000円", tone: "text-text-primary" },
  { icon: <PlayIcon size={16} />, name: "Netflix", note: "毎月15日 ・ 自動記帳", amount: "−1,490円", tone: "text-text-primary" },
  { icon: <TargetIcon size={16} />, name: "旅行ファンド", note: "毎月1日 ・ 自動積立", amount: "+30,000円", tone: "text-income" },
];

function AutomationMock() {
  return (
    <Frame>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] text-text-tertiary">自動で記録・積立</span>
        <Badge tone="accent" size="sm">
          <RepeatIcon size={12} /> 定期
        </Badge>
      </div>
      <div className="space-y-2">
        {AUTOMATION_ROWS.map((r) => (
          <div key={r.name} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="tap-target grid h-8 w-8 place-items-center rounded-full bg-surface-1 text-text-secondary">
              {r.icon}
            </span>
            <span className="flex-1">
              <span className="block text-[13px] font-medium">{r.name}</span>
              <span className="block text-[11px] text-text-tertiary">{r.note}</span>
            </span>
            <span className={`text-[13px] font-semibold tabular-nums ${r.tone}`}>{r.amount}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}


/**
 * カレンダー表示のモック。
 *
 * 実画面と同じく日曜始まりの7列。金額は収入を緑、支出を赤で小さく添える。
 * 「どの日にいくら」がひと目で分かる、という説明の裏づけになる図にする。
 */
const CAL_ROWS: { day: number; income?: string; expense?: string; today?: boolean }[][] = [
  [{ day: 27 }, { day: 28 }, { day: 29 }, { day: 30 }, { day: 31 }, { day: 1, expense: "1.2千" }, { day: 2 }],
  [
    { day: 3, expense: "820" },
    { day: 4 },
    { day: 5, expense: "3.4千" },
    { day: 6 },
    { day: 7, income: "32万" },
    { day: 8, expense: "1.1千" },
    { day: 9 },
  ],
  [
    { day: 10 },
    { day: 11, expense: "6.8千" },
    { day: 12 },
    { day: 13, expense: "450" },
    { day: 14 },
    { day: 15, expense: "1.5千" },
    { day: 16, today: true },
  ],
  [{ day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 }, { day: 22 }, { day: 23 }],
];

function CalendarMock() {
  return (
    <Frame>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-medium">2026年8月</span>
        <Badge tone="accent" size="sm">
          <CalendarIcon size={12} /> カレンダー
        </Badge>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-text-tertiary">
        {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
          <div key={w} className={i === 0 ? "text-expense" : i === 6 ? "text-accent" : ""}>
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-px">
        {CAL_ROWS.flat().map((d, i) => (
          <div
            key={i}
            className={`min-h-[38px] rounded-md px-0.5 py-1 text-center ${
              d.today ? "bg-accent/10 ring-1 ring-accent/40" : "bg-surface-2/60"
            }`}
          >
            <div className="text-[10px] leading-none text-text-secondary">{d.day}</div>
            {d.income && (
              <div className="mt-0.5 text-[9px] leading-tight text-income tabular-nums">
                {d.income}
              </div>
            )}
            {d.expense && (
              <div className="mt-0.5 text-[9px] leading-tight text-expense tabular-nums">
                {d.expense}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-[11px]">
        <span className="text-text-tertiary">8月の収支</span>
        <span className="tabular-nums">
          <span className="text-income">+320,000</span>
          <span className="mx-1 text-text-tertiary">/</span>
          <span className="text-expense">−164,900</span>
        </span>
      </div>
    </Frame>
  );
}

/**
 * 分析タブのモック。
 *
 * 8つの切り口があることが伝わればよいので、タブの並びと
 * 月ごとの棒グラフを出す。実画面と同じく選択中のタブに下線を引く。
 */
const REPORT_TABS = ["支出", "収入", "収支", "年間支出", "年間収入", "貯蓄", "貯蓄率", "予算"];
const REPORT_BARS = [52, 68, 44, 80, 61, 73, 38, 90, 57, 66, 49, 71];

function ReportTabsMock() {
  return (
    <Frame>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-medium">分析</span>
        <Badge tone="accent" size="sm">
          <ChartIcon size={12} /> 8タブ
        </Badge>
      </div>
      {/* タブ。狭いところでは実画面と同じく横に流れ、端で切れる。
          min-w-0 が無いと、8個ぶんの幅がそのまま外側に伝わって画面が横に広がる。 */}
      <div className="flex min-w-0 gap-1 overflow-hidden border-b border-border-subtle pb-1.5">
        {REPORT_TABS.map((t, i) => (
          <span
            key={t}
            className={`shrink-0 rounded-md px-2 py-1 text-[11px] ${
              i === 3
                ? "bg-accent/10 font-medium text-accent"
                : "text-text-tertiary"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex h-[104px] items-end gap-1.5">
        {REPORT_BARS.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`flex-1 rounded-t-[3px] ${i === 7 ? "bg-accent-solid" : "bg-accent/25"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-text-tertiary">
        <span>1月</span>
        <span>6月</span>
        <span>12月</span>
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-[11px]">
        <span className="text-text-tertiary">年間支出</span>
        <span className="font-semibold tabular-nums">1,842,600円</span>
      </div>
    </Frame>
  );
}

/**
 * 節ごとの図。
 *
 * 一覧で持ち、キーを型にする。switch に default を置いていたときは、
 * 節を足してもコンパイルが通り、カレンダーの説明の横にコストタイムの
 * 図が出たまま公開されていた。ここに足し忘れれば型で止まる。
 */
export const FEATURE_MOCKS = {
  "カレンダー表示": CalendarMock,
  "8つの切り口の分析": ReportTabsMock,
  "自動化・繰り返し": AutomationMock,
  コストタイム: CostTimeMock,
  "サブスク・スタック": StackMock,
  "サブスク・レビュー": ReviewMock,
  ファミリー共有: FamilyMock,
} as const;

export type FeatureTag = keyof typeof FEATURE_MOCKS;

export function FeatureMock({ tag }: { tag: FeatureTag }) {
  const Mock = FEATURE_MOCKS[tag];
  return <Mock />;
}
