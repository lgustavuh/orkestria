import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Meu perfil' })
  getMe(@CurrentUser() user: any) {
    return this.users.findOne(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Editar meu perfil' })
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.update(user.sub, dto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Alterar minha senha' })
  changeMyPassword(@CurrentUser() user: any, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.users.changeMyPassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Get()
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Listar usuários (Admin)' })
  findAll(@Query() query: any, @CurrentTenant() tenantId: string) {
    return this.users.findAll(query, tenantId);
  }

  @Get('team')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Listar equipe (Admin/Estrategista)' })
  findTeam(@CurrentTenant() tenantId: string) {
    return this.users.findAll({ isActive: true }, tenantId);
  }

  @Get(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Detalhe do usuário (Admin)' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Criar usuário (Admin)' })
  create(@Body() dto: { email: string; password: string; firstName: string; lastName: string; phone?: string; roleId?: string }, @CurrentTenant() tenantId: string) {
    return this.users.create(dto, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Editar usuário (Admin)' })
  updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.users.update(id, dto);
  }

  @Patch(':id/password')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Resetar senha do usuário (Admin)' })
  resetPassword(@Param('id') id: string, @Body() dto: { password: string }) {
    return this.users.changePassword(id, dto.password);
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Reativar usuário (Admin)' })
  activate(@Param('id') id: string) {
    return this.users.activate(id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Excluir usuário (Admin)' })
  remove(@Param('id') id: string) {
    return this.users.deleteUser(id);
  }

  @Post(':id/roles')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Atribuir perfil (Admin)' })
  assignRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.users.assignRole(id, body.roleId);
  }

  @Delete(':id/roles')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Remover perfil (Admin)' })
  removeRole(@Param('id') id: string, @Body() body: { roleId: string }) {
    return this.users.removeRole(id, body.roleId);
  }
}
