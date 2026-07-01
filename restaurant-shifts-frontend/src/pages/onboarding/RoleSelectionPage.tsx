import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from '@/store/onboarding';
import type { UserRole } from '@/types';
import { cn } from '@/utils/cn';

const ROLES: {
  role: UserRole;
  icon: string;
  title: string;
  desc: string;
  features: string[];
}[] = [
  {
    role: 'employee',
    icon: '👨‍🍳',
    title: 'Працівник',
    desc: 'Працюю за графіком',
    features: ['Перегляд графіка', 'Бронювання змін', 'Запити на заміну'],
  },
  {
    role: 'admin',
    icon: '👨‍💼',
    title: 'Адміністратор',
    desc: 'Керую закладом',
    features: ['Керування графіками', 'Керування персоналом', 'Керування закладом'],
  },
  {
    role: 'owner',
    icon: '👑',
    title: 'Власник',
    desc: 'Володію закладом',
    features: ['Повне керування системою', 'Аналітика', 'Управління закладами'],
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const selectedRole = useOnboardingStore((s) => s.selectedRole);
  const setSelectedRole = useOnboardingStore((s) => s.setSelectedRole);

  const continueNext = () => {
    if (!selectedRole) return;
    navigate('/onboarding/profile');
  };

  return (
    <div className="page !pb-6">
      <h1 className="page-title">Оберіть роль</h1>
      <p className="mb-4 text-sm text-[var(--tg-hint)]">
        Це визначить доступні функції в системі
      </p>

      <div className="space-y-3">
        {ROLES.map((r) => (
          <button
            key={r.role}
            type="button"
            className={cn(
              'card w-full text-left transition',
              selectedRole === r.role &&
                'ring-2 ring-[var(--crew-burgundy)] bg-[color-mix(in_srgb,var(--crew-burgundy)_8%,var(--tg-secondary-bg))]',
            )}
            onClick={() => setSelectedRole(r.role)}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{r.icon}</span>
              <div>
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-[var(--tg-hint)]">{r.desc}</div>
                <ul className="mt-2 space-y-0.5 text-xs text-[var(--tg-hint)]">
                  {r.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary mt-6"
        disabled={!selectedRole}
        onClick={continueNext}
      >
        Далі
      </button>
    </div>
  );
}
