import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { APP_VERSION, pageMetadata, SITE } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "ビルド情報",
  path: "/status",
  noindex: true,
});

/**
 * いま公開されているビルドの身元。
 *
 * このページはビルド時に作り切って配信する（データベースにも環境変数にも
 * 実行時には触らない）。そのため、アプリ側が動かない状況でも必ず開ける。
 *
 * 用途はひとつ。「新しいデプロイが本当に公開されたのか」を、
 * ログを見に行かずに判別すること。修正を出したのに画面が変わらないとき、
 * 原因がコードなのか配信が届いていないのかで調べる先がまるで違う。
 * ここの値が変わらなければ、届いていない。
 */
export const dynamic = "force-static";

/** 値が入っていない環境（ローカル等）では素直にそう出す。 */
function orUnknown(value: string | undefined): string {
  return value && value.length > 0 ? value : "不明";
}

const BUILD = {
  version: APP_VERSION,
  builtAt: new Date().toISOString(),
  commit: orUnknown(process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)),
  branch: orUnknown(process.env.VERCEL_GIT_COMMIT_REF),
  env: orUnknown(process.env.VERCEL_ENV),
};

const ROWS: [string, string][] = [
  ["バージョン", BUILD.version],
  ["ビルド日時 (UTC)", BUILD.builtAt],
  ["コミット", BUILD.commit],
  ["ブランチ", BUILD.branch],
  ["環境", BUILD.env],
];

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="text-[28px] font-bold tracking-tight">ビルド情報</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
        いま公開されている {SITE.name} のビルドです。このページは配信時に作り切っているため、
        アプリ側に問題があっても表示されます。
      </p>

      <Card className="mt-6 p-0">
        <dl className="divide-y divide-border-subtle">
          {ROWS.map(([label, value]) => (
            <div key={label} className="flex flex-wrap items-baseline gap-2 px-5 py-3.5">
              <dt className="text-[14px] text-text-secondary">{label}</dt>
              <dd className="ml-auto font-mono text-[14px] break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-6 space-y-3 text-[14px] leading-relaxed text-text-secondary">
        <p>
          修正したはずの内容が反映されていないときは、まずここの「コミット」を確認してください。
          値が変わっていなければ、新しいビルドがまだ公開されていません。
        </p>
        <p>
          データベースの状態は{" "}
          <Link href="/api/health" className="font-medium text-accent">
            /api/health
          </Link>{" "}
          で確認いただけます。
        </p>
      </div>
    </div>
  );
}
