import { endImpersonationAction } from "@/modules/admin/impersonation-actions";
import { ShieldIcon } from "@/components/icons";

/**
 * 成りすまし閲覧中であることを常時示す帯。
 *
 * 見落とすと「自分のアカウントを操作しているつもりで他人の画面を見ている」
 * 状態になるため、画面最上部に固定して、終了導線を必ず添える。
 */
export function ImpersonationBanner({ userLabel }: { userLabel: string }) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning px-4 py-2 text-white">
      <ShieldIcon size={16} />
      <span className="text-[13px] font-medium">
        {userLabel} として閲覧中（読み取り専用）
      </span>
      <form action={endImpersonationAction} className="ml-auto">
        <button
          type="submit"
          className="rounded-full bg-white/20 px-3 py-1 text-[13px] font-medium transition hover:bg-white/30"
        >
          終了する
        </button>
      </form>
    </div>
  );
}
