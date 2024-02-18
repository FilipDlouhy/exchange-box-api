import {
  Controller,
  All,
  Req,
  Res,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiGatewayService } from './api-gateway.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('*')
  @UseInterceptors(FilesInterceptor('images', 20, { storage: memoryStorage() }))
  async handleRequest(
    @Req() req: Request,
    @Res() response: Response,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    try {
      const serviceResponse = await this.apiGatewayService.rerouteRequest(
        req,
        files,
      );

      return response.json(serviceResponse);
    } catch (error) {
      console.error('Error handling request:', error);
      throw error;
    }
  }
}
