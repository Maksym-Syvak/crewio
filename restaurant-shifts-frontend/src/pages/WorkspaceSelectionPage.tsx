import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { PageSkeleton } from '@/components/Skeleton';
import { ROLE_LABELS } from '@/utils/roles';
import { needsWorkspaceSelection } from '@/utils/workspace';

export default function WorkspaceSelectionPage() {
  const navigate = useNavigate();
  const workspaces = useAuthStore((s) => s.workspaces);
  const activeRestaurantId = useAuthStore((s) => s.activeRestaurantId);
  const contextLoaded = useAuthStore((s) => s.contextLoaded);
  const switchWorkspace = useAuthStore((s) => s.switchWorkspace);

  if (!contextLoaded) return <PageSkeleton />;

  if (!needsWorkspaceSelection(workspaces, activeRestaurantId, contextLoaded)) {
    return <Navigate to="/" replace />;
  }

  const handleSelect = async (restaurantId: string) => {
    await switchWorkspace(restaurantId);
    navigate('/', { replace: true });
  };

  return (
    <div className="page mx-auto min-h-full max-w-lg bg-[var(--tg-bg)]">
      <h1 className="page-title">Оберіть заклад</h1>
      <p className="mb-5 text-sm text-[var(--tg-hint)]">
        У вас кілька закладів — оберіть, з яким працювати зараз
      </p>

      <ul className="space-y-2">
        {workspaces.map((ws) => (
          <li key={ws.restaurant.id}>
            <button
              type="button"
              className="card flex w-full items-center justify-between text-left"
              onClick={() => void handleSelect(ws.restaurant.id)}
            >
              <span>
                <span className="block font-medium">🏪 {ws.restaurant.name}</span>
                <span className="text-xs text-[var(--tg-hint)]">
                  {ROLE_LABELS[ws.role]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
