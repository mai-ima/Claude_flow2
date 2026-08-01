"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  RepeatIcon,
  ChartIcon,
  SparklesIcon,
  TargetIcon,
  WalletIcon,
  ArrowUpIcon,
  ClockIcon,
  SlidersIcon,
  FlagIcon,
  TrashIcon,
} from "@/components/icons";
import {
  markAllRead,
  markRead,
  deleteNotification,
  deleteReadNotifications,
} from "@/modules/notifications/actions";
import { cn } from "@/lib/cn";
import { useDismissable } from "@/lib/use-dismissable";

export interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  timeLabel: string;
}

function iconFor(type: string) {
  if (type === "RENEWAL" || type === "RECURRING") return RepeatIcon;
  if (type === "SUMMARY") return ChartIcon;
  if (type === "GOAL") return TargetIcon;
  if (type === "BUDGET") return WalletIcon;
  if (type === "PRICE_CHANGE") return ArrowUpIcon;
  if (type === "TRIAL_END") return ClockIcon;
  if (type === "REVIEW") return SlidersIcon;
  if (type === "FEEDBACK") return FlagIcon;
  return SparklesIcon;
}

export function NotificationBell({
  items,
  unread,
}: {
  items: NotifItem[];
  unread: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(open, close, wrapRef);
  const [, start] = useTransition();

  function openPanel() {
    setOpen((v) => !v);
  }
  function readAll() {
    start(async () => {
      const res = await markAllRead({});
      if (!res.ok) return; // 既読化の失敗は表示を壊さないので静かに無視
      router.refresh();
    });
  }
  function onItem(it: NotifItem) {
    setOpen(false);
    start(async () => {
      if (!it.read) await markRead({ id: it.id });
      if (it.href) router.push(it.href);
      else router.refresh();
    });
  }
  /** 1件消す。開いたパネルは閉じない（続けて片付けられるように）。 */
  function removeOne(e: React.MouseEvent, id: string) {
    // 行そのものが「開く」ボタンなので、押した先へ飛ばないように止める。
    e.stopPropagation();
    start(async () => {
      const res = await deleteNotification({ id });
      if (!res.ok) return;
      router.refresh();
    });
  }
  function removeRead() {
    start(async () => {
      const res = await deleteReadNotifications({});
      if (!res.ok) return;
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={openPanel}
        aria-label="通知"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-full text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span
            aria-label={`未読${unread}件`}
            className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-expense-solid px-1 text-[10px] font-bold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="absolute right-0 top-full z-20 mt-2 w-80 max-w-[88vw] overflow-hidden rounded-2xl border border-border-subtle bg-surface-1 shadow-lg" role="menu">
            <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-2.5">
              <span className="text-[14px] font-semibold">通知</span>
              <span className="ml-auto flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={readAll} className="tap-target text-[12px] font-medium text-accent">
                    すべて既読
                  </button>
                )}
                {items.some((i) => i.read) && (
                  <button
                    onClick={removeRead}
                    className="tap-target text-[12px] font-medium text-text-tertiary hover:text-expense"
                  >
                    読んだものを消す
                  </button>
                )}
              </span>
            </div>
            <div className="max-h-[60dvh] overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-text-tertiary">
                  通知はありません
                </div>
              ) : (
                items.map((it) => {
                  const Icon = iconFor(it.type);
                  return (
                    // 行そのものはボタンにしない。中に削除ボタンを置くため
                    // （button の中に button は置けない）。
                    <div
                      key={it.id}
                      className={cn(
                        "flex items-start gap-2 border-t border-border-subtle pr-2 first:border-t-0 hover:bg-surface-2",
                        !it.read && "bg-accent/5",
                      )}
                    >
                      <button
                        onClick={() => onItem(it)}
                        className="flex min-w-0 flex-1 items-start gap-3 py-3 pl-4 text-left"
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-text-secondary">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium">{it.title}</span>
                          <span className="block text-[12px] leading-relaxed text-text-secondary">
                            {it.body}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-text-tertiary">
                            {it.timeLabel}
                          </span>
                        </span>
                        {!it.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                      </button>
                      <button
                        onClick={(e) => removeOne(e, it.id)}
                        aria-label={`「${it.title}」を消す`}
                        className="tap-target mt-2.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-expense/10 hover:text-expense"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
