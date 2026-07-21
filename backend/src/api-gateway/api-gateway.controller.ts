import { Controller, Get } from '@nestjs/common';
import { ApiGatewayService } from './api-gateway.service';

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
