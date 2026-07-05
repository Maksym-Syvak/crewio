import { cn } from '@/utils/cn';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

/** Red triangle sized to match calendar status dots (sm ≈ 6px, md ≈ 8px). */
export function UrgentTriangleMarker({ className, size = 'sm' }: Props) {
  return (
    <span
      className={cn(
        'inline-block h-0 w-0 border-solid border-x-transparent border-t-0 border-b-[var(--crew-crimson)]',
        size === 'sm' && 'mt-0.5 border-x-[3px] border-b-[5px]',
        size === 'md' && 'border-x-4 border-b-[7px]',
        className,
      )}
      aria-hidden
    />
  );
}
