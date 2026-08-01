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
        <Skeleton className="mt-5 h-10 w-56" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </PageContainer>
    </div>
  );
}
