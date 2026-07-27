"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ShieldIcon, TrashIcon } from "@/components/icons";
import {
  setUserTier,
  setAdminRole,
  deleteUser,
  suspendUser,
  unsuspendUser,
  startImpersonate,
} from "../actions";
import { ADMIN_ROLE_LABEL, type AdminRole } from "@/lib/admin-role";
import { DangerousAdminDialog } from "./dangerous-admin-dialog";
import { Field, Select } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  adminRole: AdminRole;
  suspended: boolean;
  tier: "FREE" | "PLUS" | "PRO";
  ledgers: number;
  createdLabel: string;
}

type Dialog =
  | { kind: "tier"; user: AdminUser; tier: AdminUser["tier"] }
  | { kind: "role"; user: AdminUser; role: AdminRole }
  | { kind: "delete"; user: AdminUser }
  | { kind: "suspend"; user: AdminUser }
  | null;

const REASON_PRESETS = ["サポート対応", "不具合の補償", "本人からの依頼", "テスト・検証"];

export function AdminUsersTable({
  users,
  selfId,
  canEdit,
  canImpersonate,
}: {
  users: AdminUser[];
  selfId: string;
  /** SUPER のみ変更操作を出す。READONLY/SUPPORT には一覧のみ見せる。 */
  canEdit: boolean;
  /** SUPPORT 以上は読み取り専用での閲覧ができる。 */
  canImpersonate: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tierReason, setTierReason] = useState(REASON_PRESETS[0]);

  function done(res: { ok: boolean; error?: string }) {
    if (!res.ok) setMsg(res.error);
    else {
      setMsg(undefined);
      setDialog(null);
    }
    router.refresh();
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      {msg && (
        <p role="alert" className="mb-3 text-[13px] text-expense">
          {msg}
        </p>
      )}
      {!canEdit && (
        <p className="mb-3 rounded-xl bg-surface-2 px-4 py-3 text-[13px] text-text-secondary">
          閲覧のみの権限です。プラン変更・権限付与・削除は行えません。
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium">{u.name ?? "（名前なし）"}</span>
                {u.adminRole !== "NONE" && (
                  <Badge tone="pod" size="sm">
                    <ShieldIcon size={11} /> {ADMIN_ROLE_LABEL[u.adminRole]}
                  </Badge>
                )}
                {u.suspended && (
                  <Badge tone="expense" size="sm">
                    凍結中
                  </Badge>
                )}
                {u.id === selfId && <Badge size="sm">自分</Badge>}
              </div>
              <div className="truncate text-[12px] text-text-tertiary">
                {u.email} ・ 帳簿{u.ledgers} ・ {u.createdLabel}
              </div>
            </div>

            <Link
              href={`/admin/users/${u.id}`}
              className="shrink-0 text-[13px] font-medium text-accent"
            >
              詳細
            </Link>

            {canImpersonate && u.id !== selfId && !u.suspended && (
              <button
                onClick={() => {
                  start(async () => {
                    const res = await startImpersonate({
                      userId: u.id,
                      reason: "サポート対応",
                    });
                    if (!res.ok) setMsg(res.error);
                    else router.push("/dashboard");
                  });
                }}
                className="shrink-0 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-medium transition hover:bg-surface-2"
              >
                この人の画面を見る
              </button>
            )}

            {canEdit && (
              <>
                <select
                  value={u.tier}
                  onChange={(e) =>
                    setDialog({ kind: "tier", user: u, tier: e.target.value as AdminUser["tier"] })
                  }
                  aria-label={`${u.email ?? "このユーザー"} のプラン`}
                  className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-2 text-[13px]"
                >
                  <option value="FREE">FREE</option>
                  <option value="PLUS">PLUS</option>
                  <option value="PRO">PRO</option>
                </select>

                <select
                  value={u.adminRole}
                  disabled={u.id === selfId}
                  onChange={(e) =>
                    setDialog({ kind: "role", user: u, role: e.target.value as AdminRole })
                  }
                  aria-label={`${u.email ?? "このユーザー"} の管理権限`}
                  className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-2 text-[13px] disabled:opacity-30"
                >
                  <option value="NONE">権限なし</option>
                  <option value="READONLY">閲覧のみ</option>
                  <option value="SUPPORT">サポート</option>
                  <option value="SUPER">全権</option>
                </select>

                <button
                  onClick={() => {
                    if (u.suspended) {
                      start(async () => {
                        const res = await unsuspendUser({ userId: u.id, reason: "凍結の解除" });
                        if (!res.ok) setMsg(res.error);
                        router.refresh();
                      });
                    } else {
                      setDialog({ kind: "suspend", user: u });
                    }
                  }}
                  disabled={u.id === selfId}
                  className="shrink-0 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-medium transition hover:bg-surface-2 disabled:opacity-30"
                >
                  {u.suspended ? "凍結を解除" : "凍結する"}
                </button>

                <button
                  onClick={() => setDialog({ kind: "delete", user: u })}
                  disabled={u.id === selfId}
                  aria-label={`${u.email ?? "このユーザー"} を削除`}
                  className="grid h-9 w-9 place-items-center rounded-lg text-text-tertiary transition hover:bg-expense/10 hover:text-expense disabled:opacity-30"
                >
                  <TrashIcon size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* プラン変更は取り返しがつくため、理由のみ求める。 */}
      <Sheet
        open={dialog?.kind === "tier"}
        onClose={() => setDialog(null)}
        title="プランを変更しますか？"
        footer={
          <div className="flex gap-2.5">
            <Button variant="gray" full size="lg" onClick={() => setDialog(null)}>
              キャンセル
            </Button>
            <Button
              full
              size="lg"
              disabled={pending}
              onClick={() => {
                if (dialog?.kind !== "tier") return;
                start(async () => {
                  done(
                    await setUserTier({
                      userId: dialog.user.id,
                      tier: dialog.tier,
                      reason: tierReason,
                    }),
                  );
                });
              }}
            >
              {pending ? "変更中…" : "変更する"}
            </Button>
          </div>
        }
      >
        {dialog?.kind === "tier" && (
          <div className="space-y-4">
            <p className="text-[14px] text-text-secondary">
              {dialog.user.email} を {dialog.user.tier} → {dialog.tier} に変更します。
            </p>
            <Field label="理由（監査ログに残ります）">
              <Select value={tierReason} onChange={(e) => setTierReason(e.target.value)}>
                {REASON_PRESETS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Sheet>

      <DangerousAdminDialog
        open={dialog?.kind === "role"}
        onClose={() => setDialog(null)}
        title="管理権限を変更しますか？"
        description={
          dialog?.kind === "role"
            ? `${dialog.user.email} の管理権限を「${ADMIN_ROLE_LABEL[dialog.user.adminRole]}」から「${ADMIN_ROLE_LABEL[dialog.role]}」に変更します。`
            : ""
        }
        confirmLabel="変更する"
        targetEmail={dialog?.kind === "role" ? dialog.user.email : null}
        pending={pending}
        onSubmit={({ confirmEmail, reason }) => {
          if (dialog?.kind !== "role") return;
          start(async () => {
            done(
              await setAdminRole({
                userId: dialog.user.id,
                role: dialog.role,
                confirmEmail,
                reason,
              }),
            );
          });
        }}
      />

      <DangerousAdminDialog
        open={dialog?.kind === "suspend"}
        onClose={() => setDialog(null)}
        title="アカウントを凍結しますか？"
        description="このユーザーはログインできなくなり、ログイン中の端末もすべて切断されます。あとから解除できます。"
        confirmLabel="凍結する"
        targetEmail={dialog?.kind === "suspend" ? dialog.user.email : null}
        danger
        pending={pending}
        onSubmit={({ confirmEmail, reason }) => {
          if (dialog?.kind !== "suspend") return;
          start(async () => {
            done(await suspendUser({ userId: dialog.user.id, confirmEmail, reason }));
          });
        }}
      />

      <DangerousAdminDialog
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title="ユーザーを削除しますか？"
        description="このユーザーと、所有する帳簿・取引・サブスクがすべて削除されます。取り消せません。"
        confirmLabel="完全に削除する"
        targetEmail={dialog?.kind === "delete" ? dialog.user.email : null}
        danger
        pending={pending}
        onSubmit={({ confirmEmail, reason }) => {
          if (dialog?.kind !== "delete") return;
          start(async () => {
            done(await deleteUser({ userId: dialog.user.id, confirmEmail, reason }));
          });
        }}
      />
    </div>
  );
}
