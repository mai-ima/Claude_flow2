import { CheckIcon } from "@/components/icons";

type Cell = boolean | string;

interface Row {
  label: string;
  free: Cell;
  plus: Cell;
  pro: Cell;
}

/**
 * プランごとにできること。
 *
 * ここに書く内容は、実際にアプリで制限しているものと必ず一致させる。
 * 以前は「高度な分析・レポート」「サブスク・スタック」「スマート解約
 * アシスト」を有料と書いていたが、実装には制限が無く、どのプランでも
 * 使えていた。料金の表で有料と言い切るのは、いちばんやってはいけない
 * 食い違いなので、実装のほうを正として書き直した。
 *
 * 制限が実際に入っているのは src/lib/plans.ts の FEATURES と、
 * CSV の書き出し・取り込み（PRO）、貯金目標・予算・更新リマインダー・
 * ファミリー共有（PLUS）、サブスク・レビュー（PRO）、サブスクの
 * 登録件数（FREE は5件）。
 */
const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "記録する",
    rows: [
      { label: "収支の記録", free: "無制限", plus: "無制限", pro: "無制限" },
      { label: "カレンダー / リスト表示", free: true, plus: true, pro: true },
      { label: "繰り返し取引・自動記帳", free: true, plus: true, pro: true },
      { label: "取引の一括編集", free: true, plus: true, pro: true },
      { label: "タグ", free: true, plus: true, pro: true },
      { label: "レシートなどの添付", free: true, plus: true, pro: true },
      { label: "よく使う絞り込みの保存", free: true, plus: true, pro: true },
    ],
  },
  {
    group: "見る・調べる",
    rows: [
      { label: "分析（8つの切り口）", free: true, plus: true, pro: true },
      { label: "コストタイム", free: true, plus: true, pro: true },
      { label: "家計の健康度", free: true, plus: true, pro: true },
      { label: "月次レポート（印刷・PDF）", free: true, plus: true, pro: true },
      { label: "資産の記録と推移", free: true, plus: true, pro: true },
    ],
  },
  {
    group: "サブスク",
    rows: [
      { label: "サブスク登録", free: "5件まで", plus: "無制限", pro: "無制限" },
      { label: "値上げ検知・体験終了通知", free: true, plus: true, pro: true },
      { label: "サブスク・スタック", free: true, plus: true, pro: true },
      { label: "解約ページへの近道", free: true, plus: true, pro: true },
      { label: "更新リマインダー", free: false, plus: true, pro: true },
      { label: "サブスク・レビュー", free: false, plus: false, pro: true },
    ],
  },
  {
    group: "管理・共有",
    rows: [
      { label: "予算管理・超過アラート", free: false, plus: true, pro: true },
      { label: "貯金目標・自動積立", free: false, plus: true, pro: true },
      { label: "ファミリー共有", free: false, plus: "最大2人", pro: "最大5人" },
      { label: "共有帳簿の精算", free: false, plus: true, pro: true },
      { label: "広告非表示", free: false, plus: true, pro: true },
    ],
  },
  {
    group: "安全・持ち出し",
    rows: [
      { label: "二要素認証", free: true, plus: true, pro: true },
      { label: "ログイン中の端末の管理", free: true, plus: true, pro: true },
      { label: "オフラインでの案内", free: true, plus: true, pro: true },
      { label: "CSV の書き出し", free: false, plus: false, pro: true },
      { label: "CSV の取り込み", free: false, plus: false, pro: true },
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
    // overflow-hidden にすると、この要素が「いちばん近いスクロールの器」に
    // なってしまい、中の sticky が効かない（列名が上へ流れて消える）。
    // 角の丸めだけしたいので overflow-clip を使う。器にはならない。
    <div className="overflow-clip rounded-2xl border border-border-subtle bg-surface-1">
      {/* 見出し行。スクロール中の行が透けないよう不透明な面を使う。
          サイトのヘッダー（h-14 = 56px）の下に貼り付ける。 */}
      <div className="sticky top-14 z-10 grid h-[44px] grid-cols-[1.9fr_1fr_1fr_1fr] items-center border-b border-border-subtle bg-surface-1">
        <div className="px-4 text-[13px] font-semibold text-text-secondary">機能</div>
        {[
          { name: "フリー", tone: "text-text-primary" },
          { name: "プラス", tone: "text-accent" },
          { name: "プロ", tone: "text-pod" },
        ].map((p) => (
          <div key={p.name} className={`px-2 text-center text-[14px] font-bold ${p.tone}`}>
            {p.name}
          </div>
        ))}
      </div>

      {ROWS.map((section) => (
        <div key={section.group}>
          {/* まとまりの見出しも貼り付ける。貼り付けないと、見出し行の
              真下に来たときに完全に隠れ、いまどの区分を見ているのか
              分からなくなる（実機で確認）。100px = ヘッダー56 + 見出し44。 */}
          <div className="sticky top-[100px] z-[9] bg-surface-2 px-4 py-2 text-[12px] font-semibold text-text-tertiary">
            {section.group}
          </div>
          {section.rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-[1.9fr_1fr_1fr_1fr] items-center border-t border-border-subtle"
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
