export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skeleton-block block ${className}`} />;
}

export function SkeletonText({
  rows = 1,
  widths = [],
}: {
  rows?: number;
  widths?: string[];
}) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={`h-3 ${widths[index] ?? "w-full"}`}
        />
      ))}
    </div>
  );
}
