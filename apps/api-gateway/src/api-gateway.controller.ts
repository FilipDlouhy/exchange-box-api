import { Controller, All, Req } from '@nestjs/common';
import { Request } from 'express'; // Import express Request and Response types if needed
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('*')
  async handleRequest(@Req() req: Request) {
    const response = await this.apiGatewayService.rerouteRequest(req);
    return response;
  }
}
