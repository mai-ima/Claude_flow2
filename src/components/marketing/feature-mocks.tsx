import { ActivityRing } from "@/components/ui/activity-ring";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, PlayIcon, MusicIcon, CartIcon, CloudIcon, UsersIcon } from "@/components/icons";
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
              <span className="h-2 w-2 rounded-full bg-income" />稼いだ
            </span>
            <span className="font-semibold tabular-nums">160時間</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-expense" />使った
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

const STACK_CARDS = [
  { name: "楽天カード", grad: "from-[#ff2d55] to-[#ff6482]", total: 8590 },
  { name: "三井住友銀行", grad: "from-[#34c759] to-[#30d158]", total: 2480 },
];

function StackMock() {
  return (
    <Frame>
      <div className="space-y-3">
        {STACK_CARDS.map((c, i) => (
          <div key={c.name} style={{ marginLeft: i * 10 }}>
            <div className={`rounded-2xl bg-gradient-to-br ${c.grad} p-4 text-white shadow-sm`}>
              <div className="text-[11px] opacity-80">{c.name}</div>
              <div className="text-[18px] font-bold tabular-nums">
                {formatMoney(c.total)}
                <span className="text-[10px] opacity-80"> /月</span>
              </div>
            </div>
          </div>
        ))}
        <div className="flex gap-2 pl-1">
          {[PlayIcon, MusicIcon, CartIcon, CloudIcon].map((Icon, i) => (
            <span key={i} className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-text-secondary">
              <Icon size={16} />
            </span>
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
            <span className="grid h-8 w-8 place-items-center rounded-full bg-pod/12 text-pod">
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
    default:
      return <CostTimeMock />;
  }
}
