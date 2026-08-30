import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiGatewayService } from './api-gateway.service';

@ApiTags('health')
@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @Get()
  getHealth() {
    return this.apiGatewayService.getHealth();
  }

  @Get('health')
  healthCheck() {
    return this.apiGatewayService.getHealth();
  }
}
