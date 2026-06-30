export function Skeleton({ className = 'h-20 w-full' }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

function cn(...c: string[]) {
  return c.filter(Boolean).join(' ');
}

export function PageSkeleton() {
  return (
    <div className="page space-y-3">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
