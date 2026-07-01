import {
  Body,
  Controller,
  Delete,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { toPublicUser } from '../../common/utils/user-response';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('password')
  async changePassword(
    @Req() req: { user: { sub: string } },
    @Body() dto: ChangePasswordDto,
  ) {
    const user = await this.usersService.changePassword(req.user.sub, dto);
    const withPassword = await this.usersService.findByIdWithPassword(req.user.sub);
    return toPublicUser(user!, withPassword?.password_hash);
  }

  @Delete('me')
  async deleteMe(
    @Req() req: { user: { sub: string } },
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(req.user.sub, dto);
  }
}
