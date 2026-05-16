import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Roles') @ApiBearerAuth() @Controller('roles') @UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private roles: RolesService) {}

  @Get() @Roles('ADMIN') findAll() { return this.roles.findAll(); }
  @Get(':id') @Roles('ADMIN') findOne(@Param('id') id: string) { return this.roles.findOne(id); }
}
