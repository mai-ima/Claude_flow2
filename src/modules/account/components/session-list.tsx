"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatJST } from "@/lib/date";
import { revokeSessionAction, revokeOtherSessionsAction } from "../actions";

export interface SessionItem {
  id: string;
  device: string;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
  isImpersonation: boolean;
}

/** 「たった今」「3時間前」程度の粗さで十分なので、日付ライブラリは使わない。 */
function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 2) return "たった今";
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 31) return `${day}日前`;
  // 31日を超えたら日付で出す。端末の時間帯ではなく日本時間で揃える。
  return formatJST(iso, "date");
}

export function SessionList({ sessions }: { sessions: SessionItem[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const others = sessions.filter((s) => !s.isCurrent).length;

  async function revoke(s: SessionItem) {
    // confirm は start() の外で待つ。中で待つと transition が保留のままになり、
    // ダイアログ自体が描画されない。
    const ok = await confirm({
      title: "この端末のログインを終了しますか",
      body: `${s.device} からのログインを終了します。その端末では再度ログインが必要になります。`,
      confirmText: "終了する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await revokeSessionAction({ sessionId: s.id });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  async function revokeAll() {
    const ok = await confirm({
      title: "他の端末をすべてログアウトしますか",
      body: `いま使っているこの端末以外、${others}件のログインを終了します。`,
      confirmText: "すべて終了する",
      danger: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await revokeOtherSessionsAction({});
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-1 px-3.5 py-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-medium">{s.device}</span>
                {s.isCurrent && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] text-accent">
                    この端末
                  </span>
                )}
                {s.isImpersonation && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-secondary">
                    管理者による閲覧
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[12px] text-text-tertiary">
                最終利用 {relative(s.lastUsedAt)}
                {s.ip ? ` ・ ${s.ip}` : ""}
              </div>
            </div>
            {!s.isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revoke(s)}
                disabled={pending}
                aria-label={`${s.device} のログインを終了`}
              >
                終了
              </Button>
            )}
          </li>
        ))}
      </ul>

      {others > 0 && (
        <Button variant="tinted" size="sm" onClick={revokeAll} disabled={pending}>
          他の端末をすべてログアウト
        </Button>
      )}
      {error && (
        <p role="alert" className="text-[13px] text-expense">
          {error}
        </p>
      )}
      <p className="text-[13px] text-text-tertiary">
        見覚えのない端末があれば終了させ、パスワードも変更してください。
      </p>
    </div>
  );
}
