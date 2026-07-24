import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiKeyService } from './services/api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Role } from './enums/role.enum';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { AuthorizationException } from '../common/exceptions';

@Controller('api/auth/api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.MERCHANT, Role.ADMIN)
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateApiKeyDto) {
    return this.apiKeyService.generate(this.requireMerchantId(user), dto.permissions, dto.name);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.apiKeyService.listForMerchant(this.requireMerchantId(user));
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.apiKeyService.revoke(id, this.requireMerchantId(user));
  }

  private requireMerchantId(user: AuthenticatedUser): string {
    if (!user.merchantId) {
      throw new AuthorizationException('This account is not linked to a merchant profile');
    }

    return user.merchantId;
  }
}
