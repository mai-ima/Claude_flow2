"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CheckIcon, ChevronRightIcon, XIcon } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { completeOnboarding } from "../actions";

/**
 * 使い始めの案内。
 *
 * 済んだかどうかは実際のデータで判定して渡ってくる。チェックを押して
 * 進む方式にすると、案内どおりに動いたのかが分からない。
 * 途中でも閉じられる。全部やるまで消えない案内は邪魔になる。
 */
export function OnboardingCard({
  hasTransaction,
  hasOwnCategory,
  hasBudget,
  suggestedBudget,
  currency = "JPY",
}: {
  hasTransaction: boolean;
  hasOwnCategory: boolean;
  hasBudget: boolean;
  suggestedBudget: number;
  currency?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const steps = [
    {
      done: hasTransaction,
      title: "はじめの記録をつける",
      body: "1件つけると、ホームと分析に数字が出るようになります。",
      href: "/transactions?new=1",
      cta: "記録する",
    },
    {
      done: hasOwnCategory,
      title: "カテゴリを自分に合わせる",
      body: "最初は一般的なカテゴリが入っています。使わないものはアーカイブし、必要なものを足せます。",
      href: "/settings/ledger",
      cta: "カテゴリを開く",
    },
    {
      done: hasBudget,
      title: "予算を決める",
      body:
        suggestedBudget > 0
          ? `直近3ヶ月の支出は月あたり およそ ${formatMoney(suggestedBudget, currency)} でした。まずはこの額を目安にできます。`
          : "月にいくらまで使うかを決めると、使いすぎたときにお知らせします。",
      href: "/budgets",
      cta: "予算を決める",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  function close() {
    start(async () => {
      await completeOnboarding({});
      router.refresh();
    });
  }

  return (
    <Card className="mb-5 p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">はじめの3つ</div>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            {doneCount === steps.length
              ? "ひととおり終わりました。この案内は閉じて構いません。"
              : `${steps.length}つのうち ${doneCount}つ 済んでいます。`}
          </p>
        </div>
        <button
          onClick={close}
          disabled={pending}
          aria-label="この案内を閉じる"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-tertiary hover:bg-surface-2 hover:text-text-primary"
        >
          <XIcon size={16} />
        </button>
      </div>

      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <li key={s.title}>
            <Link
              href={s.href}
              className={cn(
                "flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                s.done ? "bg-surface-2/60" : "bg-surface-2 hover:bg-surface-3",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  s.done
                    ? "border-income bg-income text-white"
                    : "border-border-strong text-transparent",
                )}
              >
                <CheckIcon size={13} />
              </span>
              {/*
                行き先の案内は本文の下に置く。右端に置くと、狭い画面では
                見出しが2行に割れて読みにくくなる（実機で確認した）。
              */}
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[14px] font-medium",
                    s.done && "text-text-tertiary line-through",
                  )}
                >
                  {s.title}
                </span>
                {!s.done && (
                  <>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-text-secondary">
                      {s.body}
                    </span>
                    <span className="mt-1.5 flex items-center gap-0.5 text-[12px] font-medium text-accent">
                      {s.cta}
                      <ChevronRightIcon size={14} />
                    </span>
                  </>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
