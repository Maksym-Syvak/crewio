import { cn } from '@/utils/cn';

interface Props {
  className?: string;
  size?: 'sm' | 'md';
}

/** Bright red triangle marker for urgent shifts in the calendar. */
export function UrgentTriangleMarker({ className, size = 'sm' }: Props) {
  return (
    <span
      className={cn(
        'inline-block h-0 w-0 border-solid border-x-transparent border-t-0 border-b-[var(--crew-crimson)] drop-shadow-[0_0_3px_rgba(196,30,58,0.85)]',
        size === 'sm' && 'mt-0.5 border-x-[5px] border-b-[9px]',
        size === 'md' && 'border-x-[6px] border-b-[11px]',
        className,
      )}
      aria-hidden
    />
  );
}
