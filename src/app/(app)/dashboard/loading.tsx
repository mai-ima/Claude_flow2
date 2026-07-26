import { PageContainer } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="読み込み中">
      <PageContainer>
        <Skeleton className="h-9 w-40" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="mt-5 h-40" />
        <Skeleton className="mt-5 h-56" />
        <Skeleton className="mt-5 h-44" />
      </PageContainer>
    </div>
  );
}
