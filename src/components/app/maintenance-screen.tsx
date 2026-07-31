import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { logoutAction } from "@/app/(auth)/actions";

/**
 * メンテナンス中の案内。
 * データベースに触らない静的な画面にして、原因が DB 側でも表示できるようにする。
 *
 * 出口を必ず用意すること。
 * これはアプリ側の全ページの代わりに出る画面で、管理画面へ行こうとしても
 * 管理者でなければ /dashboard へ戻され、またこの画面に来る。
 * 出口が「トップページへ」しか無かったため、メンテナンス中に管理者が
 * 別のアカウントでログインすると、解除もログインし直しもできない
 * 行き止まりになっていた。
 */
export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface-0 px-5 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-solid text-white">
          <LogoMark size={26} />
        </span>
        <h1 className="mt-6 text-[24px] font-bold tracking-tight">メンテナンス中です</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">{message}</p>

        <p className="mt-4 text-[13px] leading-relaxed text-text-tertiary">
          管理者の方は、ログアウトして管理者アカウントでログインすると解除できます。
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          {/* 管理者アカウントなど、別のアカウントで入り直せるようにする。 */}
          <form action={logoutAction}>
            <button
              type="submit"
              className="min-h-11 rounded-xl border border-border-subtle bg-surface-1 px-5 text-[14px] font-medium transition hover:opacity-80"
            >
              ログアウトして別のアカウントでログイン
            </button>
          </form>
          <Link href="/" className="text-[14px] text-text-secondary hover:text-text-primary">
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
}
