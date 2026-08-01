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
} from "@/components/icons";
import { formatMoney } from "@/lib/money";

/** 機能紹介用の、実UIを模した軽量モック（純表示・絵文字なし）。 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-border-subtle bg-surface-0 p-4 shadow-md">
      <div className="rounded-[20px] bg-surface-1 p-4">{children}</div>
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

export function FeatureMock({ tag }: { tag: string }) {
  switch (tag) {
    case "コストタイム":
      return <CostTimeMock />;
    case "サブスク・スタック":
      return <StackMock />;
    case "サブスク・レビュー":
      return <ReviewMock />;
    case "ファミリー共有":
      return <FamilyMock />;
    case "自動化・繰り返し":
      return <AutomationMock />;
    default:
      return <CostTimeMock />;
  }
}
