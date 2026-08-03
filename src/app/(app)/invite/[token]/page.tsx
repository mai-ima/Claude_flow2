import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";
import { getCurrentUser } from "@/lib/auth";
import { lookupInvite } from "@/modules/ledgers/invites";
import { AcceptInvite } from "@/modules/ledgers/components/accept-invite";

export const metadata: Metadata = pageMetadata({
  title: "家計簿への招待",
  path: "/invite",
  noindex: true,
});

export const dynamic = "force-dynamic";

/**
 * 招待リンクの受け口。
 *
 * 未ログインなら、ログイン後にここへ戻す。登録した直後でもここに戻るので、
 * 「招待 → 登録 → そのまま参加」が一続きになる。
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const found = await lookupInvite(token);

  if (!found.ok) {
    const message =
      found.reason === "USED"
        ? "この招待はすでに受け取り済みです。"
        : found.reason === "REVOKED"
          ? "この招待は取り消されています。"
          : found.reason === "EXPIRED"
            ? "この招待は期限が切れています。"
            : "この招待リンクは使えません。";
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <Card className="p-7">
          <h1 className="text-[20px] font-bold tracking-tight">招待を確認できませんでした</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
            {message}
            <br />
            お手数ですが、招待した方へ、もう一度お送りいただくようご依頼ください。
          </p>
          <Link href="/dashboard" className="mt-6 block">
            <Button full size="lg">
              ホームへ
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <Card className="p-7 text-center">
        <h1 className="text-[20px] font-bold tracking-tight">家計簿への招待</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
          「{found.invite.ledgerName}」に招待されています。
        </p>
        <p className="mt-1 text-[13px] text-text-tertiary">
          参加すると、{found.invite.role === "VIEWER" ? "閲覧のみできます。" : "記録の追加・編集ができます。"}
        </p>
        <div className="mt-6">
          <AcceptInvite
            token={token}
            invitedEmail={found.invite.email}
            currentEmail={user.email}
            emailVerified={user.emailVerified}
          />
        </div>
      </Card>
    </div>
  );
}
