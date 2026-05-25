import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('Approvals')
@ApiBearerAuth()
@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private approvals: ApprovalsService) {}

  @Post()
  @ApiOperation({ summary: 'Enviar para aprovação' })
  create(
    @CurrentUser('sub') userId: string,
    @Body() body: {
      taskId?: string;
      fileId?: string;
      type: 'INTERNAL' | 'CLIENT';
      title: string;
      description?: string;
    },
  ) {
    return this.approvals.create({ ...body, requestedById: userId });
  }

  @Get()
  @ApiOperation({ summary: 'Listar aprovações' })
  findAll(
    @CurrentUser() user: any,
    @Query() query: { projectId?: string; status?: string; type?: string; page?: number; limit?: number },
    @CurrentTenant() tenantId: string,
  ) {
    return this.approvals.findAll(user.sub, user.roles, query, tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'STRATEGIST')
  @ApiOperation({ summary: 'Resolver aprovação interna' })
  resolve(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: { status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'; feedback?: string },
  ) {
    return this.approvals.resolve(id, user.sub, user.roles, body.status, body.feedback);
  }
}
