import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeesRepo: Repository<Employee>,
  ) {}

  findAll(restaurantId?: string) {
    return this.employeesRepo.find({
      where: restaurantId ? { restaurant_id: restaurantId } : {},
      relations: ['user', 'position'],
    });
  }

  async findOne(id: string) {
    const employee = await this.employeesRepo.findOne({
      where: { id },
      relations: ['user', 'position', 'restaurant'],
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  create(dto: CreateEmployeeDto) {
    return this.employeesRepo.save(this.employeesRepo.create(dto));
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.employeesRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);
    await this.employeesRepo.remove(employee);
    return { deleted: true };
  }
}
