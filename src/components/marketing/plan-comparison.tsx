import { CheckIcon } from "@/components/icons";

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  plus: Cell;
  pro: Cell;
}

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "基本",
    rows: [
      { label: "収支の記録", free: "無制限", plus: "無制限", pro: "無制限" },
      { label: "サブスク登録", free: "5件まで", plus: "無制限", pro: "無制限" },
      { label: "基本ダッシュボード", free: true, plus: true, pro: true },
      { label: "コストタイム", free: true, plus: true, pro: true },
    ],
  },
  {
    group: "管理",
    rows: [
      { label: "予算管理", free: false, plus: true, pro: true },
      { label: "更新リマインダー", free: false, plus: true, pro: true },
      { label: "サブスク・スタック", free: false, plus: true, pro: true },
      { label: "ファミリー共有", free: false, plus: "最大2人", pro: "最大5人" },
      { label: "広告非表示", free: false, plus: true, pro: true },
    ],
  },
  {
    group: "プロ向け",
    rows: [
      { label: "サブスク・レビュー", free: false, plus: false, pro: true },
      { label: "スマート解約アシスト", free: false, plus: false, pro: true },
      { label: "高度な分析・レポート", free: false, plus: false, pro: true },
      { label: "CSV エクスポート", free: false, plus: false, pro: true },
    ],
  },
];

function CellView({ value }: { value: Cell }) {
  if (value === true) return <CheckIcon size={18} className="mx-auto text-success" />;
  if (value === false) return <span className="text-text-tertiary">—</span>;
  return <span className="text-[13px] font-medium">{value}</span>;
}

export function PlanComparison() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
      {/* header */}
      <div className="sticky top-14 z-10 grid grid-cols-[1.6fr_1fr_1fr_1fr] border-b border-border-subtle bg-glass backdrop-blur-xl">
        <div className="px-4 py-3 text-[13px] font-semibold text-text-secondary">機能</div>
        {[
          { name: "フリー", tone: "text-text-primary" },
          { name: "プラス", tone: "text-accent" },
          { name: "プロ", tone: "text-pod" },
        ].map((p) => (
          <div key={p.name} className={`px-2 py-3 text-center text-[14px] font-bold ${p.tone}`}>
            {p.name}
          </div>
        ))}
      </div>

      {ROWS.map((section) => (
        <div key={section.group}>
          <div className="bg-surface-2/60 px-4 py-2 text-[12px] font-semibold text-text-tertiary">
            {section.group}
          </div>
          {section.rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center border-t border-border-subtle"
            >
              <div className="px-4 py-3 text-[14px]">{r.label}</div>
              <div className="px-2 py-3 text-center">
                <CellView value={r.free} />
              </div>
              <div className="px-2 py-3 text-center">
                <CellView value={r.plus} />
              </div>
              <div className="px-2 py-3 text-center">
                <CellView value={r.pro} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
