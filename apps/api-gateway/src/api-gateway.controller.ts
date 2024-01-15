import {
  Controller,
  All,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request } from 'express'; // Import express Request and Response types if needed
import { ApiGatewayService } from './api-gateway.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('*')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async handleRequest(@Req() req: Request, @UploadedFile() file) {
    try {
      const response = await this.apiGatewayService.rerouteRequest(req, file);
      return response;
    } catch (error) {
      console.error('Error handling request:', error);
      throw error; // Or handle the error as you see fit
    }
  }
}
