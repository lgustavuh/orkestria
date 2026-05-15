import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private comments: CommentsService) {}

  @Post('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Adicionar comentário a uma tarefa' })
  create(
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
    @Body() body: {
      content: string;
      visibility?: 'INTERNAL' | 'CLIENT_VISIBLE';
      parentId?: string;
      mentionedUserIds?: string[];
    },
  ) {
    return this.comments.create({
      taskId,
      userId: user.sub,
      ...body,
    });
  }

  @Get('tasks/:taskId/comments')
  @ApiOperation({ summary: 'Listar comentários da tarefa' })
  findByTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: any,
  ) {
    return this.comments.findByTask(taskId, user.sub, user.roles);
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Editar comentário próprio' })
  update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body('content') content: string,
  ) {
    return this.comments.update(id, userId, content);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Excluir comentário' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.comments.delete(id, user.sub, user.roles);
  }
}
