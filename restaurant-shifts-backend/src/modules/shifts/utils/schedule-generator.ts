import { BadRequestException } from '@nestjs/common';
import {
  GenerateScheduleDto,
  RotationPreset,
  ScheduleMode,
} from '../dto/generate-schedule.dto';

export interface GeneratedShiftSlot {
  start_time: Date;
  end_time: Date;
}

function parseDateOnly(iso: string): Date {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return d;
}

function combineDateAndTime(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(h, m, 0, 0);
  return result;
}

/** JS getDay(): 0=Sun … 6=Sat → 0=Mon … 6=Sun */
export function toIsoWeekday(date: Date): number {
  const js = date.getDay();
  return js === 0 ? 6 : js - 1;
}

function resolveRotation(dto: GenerateScheduleDto): { work: number; rest: number } {
  if (dto.mode === ScheduleMode.CUSTOM_CYCLE) {
    if (!dto.work_days || !dto.rest_days) {
      throw new BadRequestException('Вкажіть робочі та вихідні дні циклу');
    }
    return { work: dto.work_days, rest: dto.rest_days };
  }

  switch (dto.preset) {
    case RotationPreset.TWO_TWO:
      return { work: 2, rest: 2 };
    case RotationPreset.THREE_THREE:
      return { work: 3, rest: 3 };
    case RotationPreset.OFFICE_5_2:
      return { work: 5, rest: 2 };
    case RotationPreset.CUSTOM:
      if (!dto.work_days || !dto.rest_days) {
        throw new BadRequestException('Вкажіть робочі та вихідні дні');
      }
      return { work: dto.work_days, rest: dto.rest_days };
    default:
      return { work: 5, rest: 2 };
  }
}

export function generateShiftSlots(dto: GenerateScheduleDto): GeneratedShiftSlot[] {
  const from = parseDateOnly(dto.date_from);
  const to = parseDateOnly(dto.date_to);
  if (from > to) {
    throw new BadRequestException('Дата «Від» не може бути пізніше «До»');
  }

  const slots: GeneratedShiftSlot[] = [];
  const cursor = new Date(from);

  if (dto.mode === ScheduleMode.WEEKLY) {
    const weekdays = dto.weekdays?.length ? dto.weekdays : [0, 1, 2, 3, 4];
    while (cursor <= to) {
      if (weekdays.includes(toIsoWeekday(cursor))) {
        const start = combineDateAndTime(cursor, dto.start_time);
        const end = combineDateAndTime(cursor, dto.end_time);
        if (end <= start) {
          throw new BadRequestException('Час кінця має бути пізніше початку');
        }
        slots.push({ start_time: start, end_time: end });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return slots;
  }

  const { work, rest } = resolveRotation(dto);
  const cycleLen = work + rest;
  let cyclePos = 0;

  while (cursor <= to) {
    if (cyclePos < work) {
      const start = combineDateAndTime(cursor, dto.start_time);
      const end = combineDateAndTime(cursor, dto.end_time);
      if (end <= start) {
        throw new BadRequestException('Час кінця має бути пізніше початку');
      }
      slots.push({ start_time: start, end_time: end });
    }
    cyclePos = (cyclePos + 1) % cycleLen;
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}
