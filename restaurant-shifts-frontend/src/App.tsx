import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { RouteGuard } from '@/components/RouteGuard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageSkeleton } from '@/components/Skeleton';
import { setupApiInterceptors } from '@/api/client';
import { useAuthStore, useAppStore } from '@/store';
import { connectSocket, disconnectSocket } from '@/sockets/events';
import { initTelegramApp } from '@/services/telegram';
import SplashPage from '@/pages/SplashPage';

const HomePage = lazy(() => import('@/pages/HomePage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const ShiftsPage = lazy(() => import('@/pages/ShiftsPage'));
const ShiftDetailPage = lazy(() => import('@/pages/ShiftDetailPage'));
const EmergencyPage = lazy(() => import('@/pages/EmergencyPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));
const StaffPage = lazy(() => import('@/pages/StaffPage'));
const CreateShiftPage = lazy(() => import('@/pages/CreateShiftPage'));
const StatisticsPage = lazy(() => import('@/pages/StatisticsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'));

function AppBootstrap() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const restaurant = useAuthStore((s) => s.restaurant);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const loadContext = useAuthStore((s) => s.loadContext);
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    initTelegramApp();
    setupApiInterceptors(
      () => useAuthStore.getState().token,
      () => logout(),
    );
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated && token && user && !restaurant) {
      loadContext();
    }
  }, [isAuthenticated, token, user, restaurant, loadContext]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      disconnectSocket();
      return;
    }
    connectSocket(restaurant?.id, user.id);
    return () => disconnectSocket();
  }, [isAuthenticated, user, restaurant?.id]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [setOnline]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/splash" element={<SplashPage />} />
        <Route
          element={
            <RouteGuard>
              <AppLayout />
            </RouteGuard>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="shifts" element={<ShiftsPage />} />
          <Route path="shifts/:id" element={<ShiftDetailPage />} />
          <Route path="emergency" element={<EmergencyPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route
            path="staff"
            element={
              <RouteGuard adminOnly>
                <StaffPage />
              </RouteGuard>
            }
          />
          <Route
            path="shifts/create"
            element={
              <RouteGuard adminOnly>
                <CreateShiftPage />
              </RouteGuard>
            }
          />
        </Route>
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route
          path="*"
          element={
            isAuthenticated ? (
              <Navigate to="/404" replace />
            ) : (
              <Navigate to="/splash" replace />
            )
          }
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppBootstrap />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
