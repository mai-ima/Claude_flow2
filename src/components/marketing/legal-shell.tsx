export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20">
      <h1 className="text-[32px] font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-[13px] text-text-tertiary">最終更新日: {updated}</p>
      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-text-secondary [&_h2]:mt-8 [&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-text-primary [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
