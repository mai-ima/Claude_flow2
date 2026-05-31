export default function AppLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:max-w-5xl">
      <div className="mb-6 h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="mb-5 h-32 animate-pulse rounded-2xl bg-surface-2" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
