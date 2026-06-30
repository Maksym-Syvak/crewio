import { io, Socket } from 'socket.io-client';
import type { Notification, ReplacementRequest, Shift } from '@/types';
import { useShiftsStore } from '@/store';
import { useNotificationsStore, useToastStore } from '@/store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(restaurantId?: string, userId?: string) {
  if (socket?.connected) return socket;

  socket = io(`${WS_URL}/events`, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    if (restaurantId) socket?.emit('join_restaurant', restaurantId);
    if (userId) socket?.emit('join_user', userId);
  });

  const { upsertShift, removeShift } = useShiftsStore.getState();
  const { prepend } = useNotificationsStore.getState();
  const { push } = useToastStore.getState();

  socket.on('shift_created', (shift: Shift) => {
    upsertShift(shift);
    push({ type: 'info', title: 'Нова зміна', body: shift.position?.name });
  });

  socket.on('shift_updated', (shift: Shift) => upsertShift(shift));

  socket.on('shift_deleted', ({ id }: { id: string }) => removeShift(id));

  socket.on('emergency_shift', (shift: Shift) => {
    upsertShift(shift);
    push({
      type: 'urgent',
      title: 'Термінова заміна!',
      body: `${shift.restaurant?.name ?? 'Зміна'} — ${shift.position?.name ?? ''}`,
    });
  });

  socket.on(
    'replacement_request',
    ({ request, shift }: { request: ReplacementRequest; shift: Shift }) => {
      upsertShift(shift);
      push({
        type: 'info',
        title: 'Запит на заміну',
        body: request.reason ?? 'Потрібна заміна',
      });
    },
  );

  socket.on('replacement_accepted', () => {
    push({ type: 'success', title: 'Заміну підтверджено' });
  });

  socket.on('notification_created', (notification: Notification) => {
    prepend(notification);
    push({ type: 'info', title: notification.title, body: notification.body });
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
