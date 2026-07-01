import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvitationTokensService } from './invitation-tokens.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('invite')
@Controller('invite')
export class InvitationTokensController {
  constructor(private readonly invitationService: InvitationTokensService) {}

  @Get(':token')
  preview(@Param('token') token: string) {
    return this.invitationService.preview(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':token/join')
  join(@Param('token') token: string, @Req() req: { user: { sub: string } }) {
    return this.invitationService.join(token, req.user.sub);
  }
}
