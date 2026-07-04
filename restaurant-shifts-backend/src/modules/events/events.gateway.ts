import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

// Implements the realtime events listed in TOR section 20:
// shift_created, shift_updated, shift_deleted, emergency_shift,
// replacement_request, replacement_accepted, notification_created.
//
// Clients should join a room per restaurant (`restaurant:<id>`) and/or per
// user (`user:<id>`) right after connecting so events can be scoped instead
// of broadcast to everyone.
@WebSocketGateway({ cors: { origin: '*' }, namespace: 'events' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_restaurant')
  joinRestaurant(client: Socket, restaurantId: string) {
    client.join(`restaurant:${restaurantId}`);
  }

  @SubscribeMessage('join_user')
  joinUser(client: Socket, userId: string) {
    client.join(`user:${userId}`);
  }

  @OnEvent('shift.created')
  onShiftCreated(shift: any) {
    this.server.to(`restaurant:${shift.restaurant_id}`).emit('shift_created', shift);
  }

  @OnEvent('shift.updated')
  onShiftUpdated(shift: any) {
    this.server.to(`restaurant:${shift.restaurant_id}`).emit('shift_updated', shift);
  }

  @OnEvent('shift.started')
  onShiftStarted(shift: any) {
    this.server.to(`restaurant:${shift.restaurant_id}`).emit('shift_updated', shift);
  }

  @OnEvent('shift.deleted')
  onShiftDeleted(payload: { id: string }) {
    this.server.emit('shift_deleted', payload);
  }

  @OnEvent('ws.emergency_shift')
  onEmergencyShift(shift: any) {
    this.server.to(`restaurant:${shift.restaurant_id}`).emit('emergency_shift', shift);
  }

  @OnEvent('ws.replacement_request')
  onReplacementRequest(payload: any) {
    this.server.emit('replacement_request', payload);
  }

  @OnEvent('ws.replacement_accepted')
  onReplacementAccepted(request: any) {
    this.server.emit('replacement_accepted', request);
  }

  @OnEvent('notification.created')
  onNotificationCreated(notification: any) {
    this.server.to(`user:${notification.user_id}`).emit('notification_created', notification);
  }

  @OnEvent('ws.schedule_generated')
  onScheduleGenerated(payload: any) {
    this.server
      .to(`restaurant:${payload.restaurant_id}`)
      .emit('schedule_generated', payload);
  }
}
