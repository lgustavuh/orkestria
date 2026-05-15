import { Module, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthModule } from '../auth/auth.module';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private search: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Busca global por projetos, tarefas, arquivos e clientes' })
  @ApiQuery({ name: 'q', required: true, description: 'Termo de busca (min 2 caracteres)' })
  @ApiQuery({ name: 'types', required: false, description: 'Filtro por tipo: project,task,file,client' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  globalSearch(
    @Query('q') q: string,
    @Query('types') types: string,
    @Query('limit') limit: number,
    @CurrentUser() user: any,
  ) {
    return this.search.globalSearch(q, user.sub, user.roles, {
      limit,
      types: types?.split(','),
    });
  }
}

@Module({
  imports: [AuthModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
