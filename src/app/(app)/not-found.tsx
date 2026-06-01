import { ButtonLink } from "@/components/ui/button";
import { SearchIcon } from "@/components/icons";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-text-tertiary">
        <SearchIcon size={28} />
      </div>
      <p className="mt-5 text-[40px] font-bold leading-none tracking-tight text-text-tertiary">404</p>
      <h1 className="mt-2 text-[20px] font-bold tracking-tight">このページはありません</h1>
      <p className="mt-2 text-[14px] text-text-secondary">
        メニューから移動するか、ダッシュボードに戻ってください。
      </p>
      <div className="mt-6 flex gap-3">
        <ButtonLink href="/dashboard">ダッシュボードへ</ButtonLink>
      </div>
    </div>
  );
}
