"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { CategoryIcon, XIcon, CheckIcon, SparklesIcon, ClockIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { recordReview } from "../actions";
import { cn } from "@/lib/cn";

export interface ReviewItem {
  id: string;
  name: string;
  icon: string;
  amount: number;
  yearly: number;
  daysSinceUsed: number | null;
  cancelUrl: string | null;
  cancelSteps: string[];
}

export function SubscriptionReview({
  items,
  onClose,
}: {
  items: ReviewItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [, start] = useTransition();

  const done = index >= items.length;
  const current = items[index];

  function decide(decision: "KEEP" | "REVIEW") {
    if (!current) return;
    start(() => {
      recordReview({ id: current.id, decision });
    });
    if (decision === "REVIEW") {
      setReviewIds((s) => [...s, current.id]);
      setFlipped(true);
      return;
    }
    advance();
  }

  function advance() {
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function finish() {
    onClose();
    router.refresh();
  }

  const savings = items
    .filter((it) => reviewIds.includes(it.id))
    .reduce((sum, it) => sum + it.yearly, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0/80 backdrop-blur-xl">
      {/* header */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-[14px] font-medium text-text-secondary">
          {done ? "完了" : `${index + 1} / ${items.length}`}
        </span>
        <button
          onClick={done ? finish : onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-text-secondary"
          aria-label="閉じる"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 pb-10">
        {done ? (
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-success/12 text-success">
              <SparklesIcon size={34} />
            </div>
            <h2 className="mt-5 text-[26px] font-bold tracking-tight">レビュー完了</h2>
            <p className="mt-2 text-[15px] text-text-secondary">
              {reviewIds.length > 0 ? (
                <>
                  見直し候補が <b>{reviewIds.length}</b> 件。解約すると年間で
                </>
              ) : (
                "すべて「必要」と判断しました。素晴らしい固定費管理です。"
              )}
            </p>
            {reviewIds.length > 0 && (
              <div className="mt-3 text-[34px] font-bold tracking-tight text-income">
                {formatMoney(savings)}
                <span className="text-[15px] text-text-tertiary"> の節約候補</span>
              </div>
            )}
            <Button full size="lg" className="mt-8" onClick={finish}>
              完了
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm [perspective:1600px]">
            <div
              className={cn(
                "relative transition-transform duration-500 [transform-style:preserve-3d]",
                flipped && "[transform:rotateY(180deg)]",
              )}
            >
              {/* front */}
              <div className="rounded-3xl border border-border-subtle bg-surface-1 p-7 shadow-lg [backface-visibility:hidden]">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent">
                  <CategoryIcon name={current.icon} size={34} />
                </div>
                <h2 className="mt-5 text-[28px] font-bold tracking-tight">{current.name}</h2>
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-[15px] text-text-secondary">
                    <ClockIcon size={18} className="text-text-tertiary" />
                    年間 <b className="text-text-primary">{formatMoney(current.yearly)}</b> 支払い
                  </div>
                  {current.daysSinceUsed !== null && (
                    <div className="flex items-center gap-2 text-[15px] text-text-secondary">
                      <ClockIcon size={18} className="text-text-tertiary" />
                      最終利用から{" "}
                      <b
                        className={cn(
                          "text-text-primary",
                          current.daysSinceUsed >= 90 && "text-warning",
                        )}
                      >
                        {current.daysSinceUsed}日
                      </b>
                    </div>
                  )}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <Button variant="gray" size="lg" onClick={() => decide("KEEP")}>
                    <CheckIcon size={18} /> 必要
                  </Button>
                  <Button variant="destructive" size="lg" onClick={() => decide("REVIEW")}>
                    見直す
                  </Button>
                </div>
              </div>

              {/* back */}
              <div className="absolute inset-0 rounded-3xl border border-border-subtle bg-surface-1 p-7 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <h3 className="text-[20px] font-bold tracking-tight">解約の手順</h3>
                {current.cancelSteps.length > 0 ? (
                  <ol className="mt-4 space-y-2.5">
                    {current.cancelSteps.map((step, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] text-text-secondary">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[12px] font-semibold text-accent">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-4 text-[14px] text-text-secondary">
                    このサービスの解約手順は登録されていません。公式サイトからお手続きください。
                  </p>
                )}
                <div className="mt-6 space-y-2">
                  {current.cancelUrl && (
                    <ButtonLink
                      href={current.cancelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      full
                      size="lg"
                    >
                      解約ページを開く
                    </ButtonLink>
                  )}
                  <Button variant="plain" full onClick={advance}>
                    次へ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
