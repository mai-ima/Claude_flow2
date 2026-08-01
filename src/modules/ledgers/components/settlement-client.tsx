"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { UsersIcon, SwapIcon, TrashIcon, PlusIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { MEMBER_ROLE_LABEL, type MemberRole } from "@/lib/enums";
import { recordSettlement, deleteSettlement, updateShareRatios } from "../actions";

export interface SettlementMemberView {
  userId: string;
  name: string;
  role: string;
  shareRatio: number;
  percent: number;
  owed: number;
  paid: number;
  settled: number;
  net: number;
}

export interface SettlementRecordView {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  dateLabel: string;
  memo: string | null;
}

/**
 * 共有帳簿の精算。
 *
 * 「いくら渡せばよいか」だけでなく、その額がどこから来たのかを同じ画面に
 * 並べる。負担額・払った額・精算済みの3つが見えていれば、金額が合わない
 * ときに自分で確かめられる。
 */
export function SettlementClient({
  monthLabel,
  total,
  unassigned,
  members,
  transfers,
  records,
  currency = "JPY",
  canEdit,
  isOwner,
  ledgerId,
  today,
}: {
  monthLabel: string;
  total: number;
  unassigned: number;
  members: SettlementMemberView[];
  transfers: { fromUserId: string; toUserId: string; amount: number }[];
  records: SettlementRecordView[];
  currency?: string;
  canEdit: boolean;
  isOwner: boolean;
  ledgerId: string;
  /** 精算の日付欄の初期値（YYYY-MM-DD）。サーバー側で作って渡す。 */
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    fromUserId: "",
    toUserId: "",
    amount: 0,
    settledAt: today,
    memo: "",
  });

  const [ratioOpen, setRatioOpen] = useState(false);
  const [ratios, setRatios] = useState<Record<string, string>>({});

  const nameOf = (userId: string) =>
    members.find((m) => m.userId === userId)?.name ?? "メンバー";

  function openSettle(fromUserId = "", toUserId = "", amount = 0) {
    setForm({ fromUserId, toUserId, amount, settledAt: today, memo: "" });
    setSheetOpen(true);
  }

  function save() {
    start(async () => {
      const res = await recordSettlement({
        fromUserId: form.fromUserId,
        toUserId: form.toUserId,
        amount: form.amount,
        settledAt: new Date(form.settledAt),
        memo: form.memo || null,
      });
      if (!res.ok) {
        toast.error(res.fieldErrors?.amount?.[0] ?? res.error);
        return;
      }
      toast.success("精算を記録しました");
      setSheetOpen(false);
      router.refresh();
    });
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "この精算の記録を取り消しますか？",
      body: "取り消すと、差引の計算からこの受け渡しが外れます。",
      confirmText: "取り消す",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteSettlement({ id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function openRatios() {
    setRatios(Object.fromEntries(members.map((m) => [m.userId, String(m.shareRatio)])));
    setRatioOpen(true);
  }

  function saveRatios() {
    start(async () => {
      const res = await updateShareRatios({
        ledgerId,
        ratios: members.map((m) => ({
          userId: m.userId,
          shareRatio: Math.max(0, parseInt(ratios[m.userId] || "0", 10) || 0),
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("負担の割合を変えました");
      setRatioOpen(false);
      router.refresh();
    });
  }

  // 入力中の重みから、その場で割合を出して見せる。保存してから
  // 「思っていた割合と違う」と気づくのでは遅い。
  const ratioTotal = members.reduce(
    (s, m) => s + (parseInt(ratios[m.userId] || "0", 10) || 0),
    0,
  );

  if (members.length <= 1) {
    return (
      <EmptyState
        icon={<UsersIcon size={28} />}
        title="精算はメンバーが2人以上の帳簿で使えます"
        description="設定のファミリー共有から家族を招待すると、誰がいくら払ったかを持ち寄って精算できます。"
      />
    );
  }

  return (
    <div>
      <Card className="mb-5 p-4">
        <div className="text-[12px] text-text-tertiary">{monthLabel}の支出</div>
        <div className="mt-1 text-[24px] font-bold tabular-nums">
          {formatMoney(total, currency)}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-text-secondary">
          この額を下の割合で分け、実際に払った額との差を出しています。
          {unassigned > 0 && (
            <>
              {" "}
              うち <b className="tabular-nums">{formatMoney(unassigned, currency)}</b> は
              払った方が未記入です。分担の計算には入りますが、立て替えとしては
              数えていません。家計簿で「払った人」を選ぶと反映されます。
            </>
          )}
        </p>
      </Card>

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text-tertiary">メンバーごとの差引</h3>
        {isOwner && (
          <button onClick={openRatios} className="tap-target py-1 text-[13px] font-medium text-accent">
            負担の割合を変える
          </button>
        )}
      </div>

      <div className="mb-5 space-y-2.5">
        {members.map((m) => (
          <Card key={m.userId} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{m.name}</span>
              <Badge size="sm">
                {MEMBER_ROLE_LABEL[m.role as MemberRole] ?? m.role}
              </Badge>
              <Badge tone="accent" size="sm">
                負担 {m.percent.toFixed(0)}%
              </Badge>
            </div>

            <dl className="mt-2 space-y-1 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-text-tertiary">本来の負担</dt>
                <dd className="tabular-nums">{formatMoney(m.owed, currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-tertiary">実際に払った</dt>
                <dd className="tabular-nums">{formatMoney(m.paid, currency)}</dd>
              </div>
              {m.settled !== 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">精算で受け渡し済み</dt>
                  <dd className="tabular-nums">
                    {m.settled > 0 ? "+" : ""}
                    {formatMoney(m.settled, currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border-subtle pt-1 font-semibold">
                <dt>差引</dt>
                <dd
                  className={
                    m.net > 0
                      ? "tabular-nums text-income"
                      : m.net < 0
                        ? "tabular-nums text-expense"
                        : "tabular-nums text-text-secondary"
                  }
                >
                  {m.net > 0
                    ? `${formatMoney(m.net, currency)} 受け取り`
                    : m.net < 0
                      ? `${formatMoney(-m.net, currency)} 支払い`
                      : "なし"}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <h3 className="mb-2 text-[13px] font-semibold text-text-tertiary">やり取りの案</h3>
      {unassigned > 0 && (
        <p className="mb-2.5 text-[12px] leading-relaxed text-text-tertiary">
          払った方が未記入の {formatMoney(unassigned, currency)} は、渡す相手が決まらないため
          この案には入っていません。そのぶん、上の「差引」と案の金額は一致しません。
          家計簿でその記録の「払った人」を選ぶと、案にも反映されます。
        </p>
      )}
      {transfers.length === 0 ? (
        <Card className="mb-5 p-4 text-[13px] text-text-secondary">
          差引はありません。いまのところ精算は不要です。
        </Card>
      ) : (
        <div className="mb-5 space-y-2.5">
          {transfers.map((t, i) => (
            <Card key={i} className="flex flex-wrap items-center gap-3 p-4">
              <SwapIcon size={18} className="shrink-0 text-text-tertiary" />
              <span className="min-w-0 flex-1 text-[14px]">
                <b>{nameOf(t.fromUserId)}</b> → <b>{nameOf(t.toUserId)}</b>
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                {formatMoney(t.amount, currency)}
              </span>
              {canEdit && (
                <Button
                  size="sm"
                  variant="tinted"
                  onClick={() => openSettle(t.fromUserId, t.toUserId, t.amount)}
                >
                  記録する
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-text-tertiary">精算の履歴</h3>
        {canEdit && (
          <Button size="sm" variant="ghost" onClick={() => openSettle()}>
            <PlusIcon size={16} /> 手で記録
          </Button>
        )}
      </div>
      {records.length === 0 ? (
        <Card className="p-4 text-[13px] text-text-secondary">
          まだ記録がありません。受け渡しを記録すると、次からは差引に反映されます。
        </Card>
      ) : (
        <div className="space-y-2.5">
          {records.map((r) => (
            <Card key={r.id} className="flex items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="block text-[14px]">
                  {r.fromName} → {r.toName}
                </span>
                <span className="block text-[12px] text-text-tertiary">
                  {r.dateLabel}
                  {r.memo ? ` ・ ${r.memo}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                {formatMoney(r.amount, currency)}
              </span>
              {canEdit && (
                <button
                  onClick={() => remove(r.id)}
                  aria-label="この精算を取り消す"
                  className="tap-target grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                >
                  <TrashIcon size={16} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 精算の記録 */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="精算を記録"
        footer={
          <Button
            full
            size="lg"
            onClick={save}
            disabled={
              pending || !form.fromUserId || !form.toUserId || form.amount <= 0 ||
              form.fromUserId === form.toUserId
            }
          >
            {pending ? "保存中…" : "記録する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
            実際にお金を渡したときに記録します。家計簿の記録は変わりません。
            この受け渡しのぶんだけ、差引が減ります。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="払った方">
              <Select
                value={form.fromUserId}
                onChange={(e) => setForm((s) => ({ ...s, fromUserId: e.target.value }))}
              >
                <option value="">選んでください</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="受け取った方">
              <Select
                value={form.toUserId}
                onChange={(e) => setForm((s) => ({ ...s, toUserId: e.target.value }))}
              >
                <option value="">選んでください</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {form.fromUserId !== "" && form.fromUserId === form.toUserId && (
            <p className="text-[12px] text-expense">
              払った方と受け取った方に同じ人は選べません。
            </p>
          )}
          <Field label="金額">
            <Input
              inputMode="numeric"
              value={form.amount ? String(form.amount) : ""}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  amount: Math.max(0, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)),
                }))
              }
              placeholder="0"
            />
          </Field>
          <Field label="日付">
            <Input
              type="date"
              value={form.settledAt}
              onChange={(e) => setForm((s) => ({ ...s, settledAt: e.target.value }))}
            />
          </Field>
          <Field label="メモ（任意）">
            <Textarea
              value={form.memo}
              onChange={(e) => setForm((s) => ({ ...s, memo: e.target.value }))}
            />
          </Field>
        </div>
      </Sheet>

      {/* 負担の割合 */}
      <Sheet
        open={ratioOpen}
        onClose={() => setRatioOpen(false)}
        title="負担の割合"
        footer={
          <Button full size="lg" onClick={saveRatios} disabled={pending || ratioTotal === 0}>
            {pending ? "保存中…" : "保存する"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-surface-2 px-3.5 py-3 text-[12px] leading-relaxed text-text-secondary">
            数字は「比」です。全員1なら均等、2と1なら2対1で分けます。
            合計を100に揃える必要はありません。0にすると、その方は負担しません。
          </p>
          {members.map((m) => {
            const v = parseInt(ratios[m.userId] || "0", 10) || 0;
            return (
              <div key={m.userId} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-[14px]">{m.name}</span>
                <Input
                  inputMode="numeric"
                  aria-label={`${m.name} の負担の比`}
                  className="h-11 w-20 text-center"
                  value={ratios[m.userId] ?? ""}
                  onChange={(e) =>
                    setRatios((s) => ({
                      ...s,
                      [m.userId]: e.target.value.replace(/\D/g, "").slice(0, 4),
                    }))
                  }
                />
                <span className="w-14 shrink-0 text-right text-[13px] tabular-nums text-text-tertiary">
                  {ratioTotal > 0 ? `${Math.round((v / ratioTotal) * 100)}%` : "—"}
                </span>
              </div>
            );
          })}
          {ratioTotal === 0 && (
            <p className="text-[12px] text-expense">
              全員を0にはできません。少なくとも1人は1以上にしてください。
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setRatios(Object.fromEntries(members.map((m) => [m.userId, "1"])))
            }
          >
            均等にする
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
