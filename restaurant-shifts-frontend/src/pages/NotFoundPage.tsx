import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">404</div>
      <h1 className="text-xl font-bold">Сторінку не знайдено</h1>
      <Link to="/" className="btn-primary max-w-xs">
        На головну
      </Link>
    </div>
  );
}
