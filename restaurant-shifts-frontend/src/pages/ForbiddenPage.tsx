import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">403</div>
      <h1 className="text-xl font-bold">Доступ заборонено</h1>
      <p className="text-sm text-[var(--tg-hint)]">
        У вас немає прав для перегляду цієї сторінки
      </p>
      <Link to="/" className="btn-primary max-w-xs">
        На головну
      </Link>
    </div>
  );
}
