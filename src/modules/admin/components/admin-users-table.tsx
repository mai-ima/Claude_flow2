"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ShieldIcon, TrashIcon } from "@/components/icons";
import { setUserTier, toggleAdmin, deleteUser } from "../actions";
import { cn } from "@/lib/cn";

export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  tier: "FREE" | "PLUS" | "PRO";
  ledgers: number;
  createdLabel: string;
}

export function AdminUsersTable({
  users,
  selfId,
}: {
  users: AdminUser[];
  selfId: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string>();

  function changeTier(userId: string, tier: "FREE" | "PLUS" | "PRO") {
    start(async () => {
      const res = await setUserTier({ userId, tier });
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }
  function flipAdmin(userId: string) {
    start(async () => {
      const res = await toggleAdmin({ userId });
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }
  async function remove(userId: string, email: string | null) {
    const ok = await confirm({
      title: `${email ?? "このユーザー"} を削除しますか？`,
      body: "関連データもすべて削除されます。この操作は取り消せません。",
      confirmText: "削除する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await deleteUser({ userId });
      if (!res.ok) setMsg(res.error);
      router.refresh();
    });
  }

  return (
    <div className={cn(pending && "opacity-70")}>
      {msg && <p className="mb-3 text-[13px] text-expense">{msg}</p>}
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex flex-wrap items-center gap-3 border-t border-border-subtle px-4 py-3 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[14px] font-medium">{u.name ?? "（名前なし）"}</span>
                {u.isAdmin && (
                  <Badge tone="pod" size="sm">
                    <ShieldIcon size={11} /> 管理者
                  </Badge>
                )}
                {u.id === selfId && <Badge size="sm">自分</Badge>}
              </div>
              <div className="truncate text-[12px] text-text-tertiary">
                {u.email} ・ 帳簿{u.ledgers} ・ {u.createdLabel}
              </div>
            </div>

            <select
              value={u.tier}
              onChange={(e) => changeTier(u.id, e.target.value as AdminUser["tier"])}
              aria-label="プラン変更"
              className="h-9 rounded-lg border border-border-subtle bg-surface-1 px-2 text-[13px]"
            >
              <option value="FREE">FREE</option>
              <option value="PLUS">PLUS</option>
              <option value="PRO">PRO</option>
            </select>

            <button
              onClick={() => flipAdmin(u.id)}
              disabled={u.id === selfId}
              className="rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-medium transition hover:bg-surface-2 disabled:opacity-30"
            >
              {u.isAdmin ? "管理者解除" : "管理者にする"}
            </button>

            <button
              onClick={() => remove(u.id, u.email)}
              disabled={u.id === selfId}
              aria-label="削除"
              className="grid h-9 w-9 place-items-center rounded-lg text-text-tertiary transition hover:bg-expense/10 hover:text-expense disabled:opacity-30"
            >
              <TrashIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
