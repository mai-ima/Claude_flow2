import { PageContainer } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer>
      <Skeleton className="h-9 w-28" />
      <Skeleton className="mt-5 h-64" />
      <Skeleton className="mt-5 h-64" />
      <div className="mt-5 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </PageContainer>
  );
}
