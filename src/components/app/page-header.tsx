export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div>
        <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em] sm:text-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-[15px] text-text-secondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:max-w-5xl">{children}</div>;
}
