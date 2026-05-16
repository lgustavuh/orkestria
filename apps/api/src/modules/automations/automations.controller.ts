import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Automations')
@ApiBearerAuth()
@Controller('automations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STRATEGIST')
export class AutomationsController {
  constructor(private automations: AutomationsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar automação' })
  create(@Body() body: any) {
    return this.automations.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'Listar automações' })
  findAll(@Query() query: { projectId?: string; trigger?: string; isActive?: boolean }) {
    return this.automations.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da automação' })
  findOne(@Param('id') id: string) {
    return this.automations.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar automação' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.automations.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir automação' })
  remove(@Param('id') id: string) {
    return this.automations.delete(id);
  }
}
