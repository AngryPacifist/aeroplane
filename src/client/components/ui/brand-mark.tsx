export function BrandMark({ className = "" }: { className?: string }) {
  return <img src="/favicon.svg" alt="" className={`h-5 w-5 ${className}`.trim()} />;
}
