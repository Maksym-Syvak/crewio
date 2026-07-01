interface OnboardingHeaderProps {
  showBack: boolean;
  onBack: () => void;
}

export function OnboardingHeader({ showBack, onBack }: OnboardingHeaderProps) {
  if (!showBack) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center border-b border-[color-mix(in_srgb,var(--crew-burgundy)_12%,transparent)] bg-[var(--tg-bg)] px-2 py-2">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--tg-link)] active:opacity-70"
        aria-label="Назад"
      >
        <span className="text-lg leading-none">←</span>
        <span>Назад</span>
      </button>
    </div>
  );
}
