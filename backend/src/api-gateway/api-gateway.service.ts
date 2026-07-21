import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiGatewayService {
  getHealth() {
    return {
      status: 'ok',
      service: 'Lumina API Gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
