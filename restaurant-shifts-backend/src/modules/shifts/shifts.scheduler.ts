import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ShiftsService } from './shifts.service';

@Injectable()
export class ShiftsScheduler {
  private readonly logger = new Logger(ShiftsScheduler.name);

  constructor(private readonly shiftsService: ShiftsService) {}

  @Cron('* * * * *')
  async handleShiftLifecycle() {
    try {
      const opened = await this.shiftsService.autoOpenDueShifts();
      const closed = await this.shiftsService.autoCloseDueShifts();
      const refreshed = await this.shiftsService.refreshUpcomingStatuses();
      const reminders = await this.shiftsService.processUrgentReminders();

      if (opened || closed || refreshed || reminders) {
        this.logger.debug(
          `Lifecycle: opened=${opened}, closed=${closed}, refreshed=${refreshed}, reminders=${reminders}`,
        );
      }
    } catch (error) {
      this.logger.error(`Shift lifecycle cron failed: ${error.message}`);
    }
  }
}
