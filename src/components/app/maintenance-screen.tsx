import Link from "next/link";
import { LogoMark } from "@/components/icons";

/**
 * メンテナンス中の案内。
 * データベースに触らない静的な画面にして、原因が DB 側でも表示できるようにする。
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
        <Link href="/" className="mt-8 inline-block text-[14px] font-medium text-accent">
          トップページへ
        </Link>
      </div>
    </div>
  );
}
