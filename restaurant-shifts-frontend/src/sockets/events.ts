import { io, Socket } from 'socket.io-client';
import type { Notification, ReplacementRequest, Shift } from '@/types';
import { useShiftsStore } from '@/store';
import { useNotificationsStore, useToastStore } from '@/store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;
let joinedRestaurantId: string | undefined;
let joinedUserId: string | undefined;
let handlersBound = false;

function joinRooms(restaurantId?: string, userId?: string) {
  if (!socket?.connected) return;
  if (restaurantId) socket.emit('join_restaurant', restaurantId);
  if (userId) socket.emit('join_user', userId);
}

function bindHandlers() {
  if (!socket || handlersBound) return;
  handlersBound = true;

  const { upsertShift, removeShift } = useShiftsStore.getState();
  const { prepend } = useNotificationsStore.getState();
  const { push } = useToastStore.getState();

  socket.on('connect', () => joinRooms(joinedRestaurantId, joinedUserId));

  socket.on('shift_created', (shift: Shift) => {
    upsertShift(shift);
    if (shift.is_urgent) {
      push({ type: 'urgent', title: '🚨 Термінова зміна', body: shift.shift_type ?? 'Нова зміна' });
    } else {
      push({ type: 'info', title: 'Нова зміна', body: shift.shift_type ?? undefined });
    }
  });

  socket.on(
    'schedule_generated',
    (payload: { count: number; date_from: string; date_to: string; shifts: Shift[] }) => {
      for (const shift of payload.shifts) upsertShift(shift);
      push({
        type: 'info',
        title: '📅 Додано новий графік',
        body: `${payload.count} змін`,
      });
    },
  );

  socket.on('shift_updated', (shift: Shift) => upsertShift(shift));
  socket.on('shift_deleted', ({ id }: { id: string }) => removeShift(id));

  socket.on('emergency_shift', (shift: Shift) => {
    upsertShift(shift);
    push({
      type: 'urgent',
      title: '🚨 Потрібно закрити зміну',
      body: shift.restaurant?.name ?? shift.shift_type ?? '',
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
}

export function connectSocket(restaurantId?: string, userId?: string) {
  joinedRestaurantId = restaurantId;
  joinedUserId = userId;

  if (!socket) {
    socket = io(`${WS_URL}/events`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
    });
    bindHandlers();
  }

  joinRooms(restaurantId, userId);
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  handlersBound = false;
  joinedRestaurantId = undefined;
  joinedUserId = undefined;
}
