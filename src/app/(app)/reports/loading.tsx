import { PageContainer } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-9 w-28" />
      {/* タブバー */}
      <div className="mt-5 flex gap-1 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-20 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="mt-5 h-[420px]" />
    </PageContainer>
  );
}
