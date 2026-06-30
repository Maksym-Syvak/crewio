import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Statistics } from './entities/statistics.entity';
import { Employee } from '../employees/entities/employee.entity';
import { ShiftEmployee } from '../shifts/entities/shift-employee.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Statistics)
    private readonly statsRepo: Repository<Statistics>,
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
    @InjectRepository(ShiftEmployee)
    private readonly shiftEmployeesRepo: Repository<ShiftEmployee>,
  ) {}

  findAll(filters: { employeeId?: string; month?: string }) {
    const where: any = {};
    if (filters.employeeId) where.employee_id = filters.employeeId;
    if (filters.month) where.month = filters.month;
    return this.statsRepo.find({ where });
  }

  // Recomputes and upserts the statistics row for one employee/month from
  // completed shifts (TOR section 15 + 17). Intended to be called by a
  // scheduled job (see @nestjs/schedule in AppModule) once shifts complete,
  // or on-demand from an admin dashboard refresh action.
  async recompute(employeeId: string, month: string) {
    const monthStart = new Date(`${month}-01T00:00:00Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const assignments = await this.shiftEmployeesRepo
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.shift', 'shift')
      .where('assignment.employee_id = :employeeId', { employeeId })
      .andWhere('shift.start_time >= :monthStart AND shift.start_time < :monthEnd', {
        monthStart,
        monthEnd,
      })
      .getMany();

    const employee = await this.employeesRepo.findOne({ where: { id: employeeId } });

    let workedHours = 0;
    let nightShifts = 0;
    for (const a of assignments) {
      const hours = (a.shift.end_time.getTime() - a.shift.start_time.getTime()) / 3_600_000;
      workedHours += hours;
      if (a.shift.start_time.getHours() >= 22 || a.shift.start_time.getHours() < 6) {
        nightShifts += 1;
      }
    }

    const hourlyRate = Number(employee?.hourly_rate ?? 0);
    const expectedSalary = workedHours * hourlyRate;

    let row = await this.statsRepo.findOne({ where: { employee_id: employeeId, month: `${month}-01` } });
    if (!row) {
      row = this.statsRepo.create({ employee_id: employeeId, month: `${month}-01` });
    }
    row.worked_hours = workedHours;
    row.worked_shifts = assignments.length;
    row.night_shifts = nightShifts;
    row.expected_salary = expectedSalary;

    return this.statsRepo.save(row);
  }
}
