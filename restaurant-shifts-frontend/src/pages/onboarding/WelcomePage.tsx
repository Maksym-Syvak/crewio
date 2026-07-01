import { useNavigate } from 'react-router-dom';

export default function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--crew-burgundy)] to-[var(--crew-burgundy-dark)] text-4xl font-bold text-white shadow-lg">
        C
      </div>
      <div>
        <h1 className="text-2xl font-bold text-[var(--crew-burgundy-dark)]">
          Ласкаво просимо до Crewio
        </h1>
        <p className="mt-2 text-sm text-[var(--tg-hint)]">
          Кілька кроків — і ви зможете керувати змінами або приєднатись до
          команди закладу
        </p>
      </div>
      <button type="button" className="btn-primary max-w-xs" onClick={() => navigate('/onboarding/role')}>
        Почати
      </button>
    </div>
  );
}
