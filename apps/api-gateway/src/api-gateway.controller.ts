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
  @UseInterceptors(FilesInterceptor('images', 20, { storage: memoryStorage() })) // Adjust '20' to the max number of files you want to allow
  async handleRequest(
    @Req() req: Request,
    @Res() response: Response,
    @UploadedFiles() files: Array<Express.Multer.File>, // Adjusted to handle multiple files
  ) {
    try {
      const serviceResponse = await this.apiGatewayService.rerouteRequest(
        req,
        files,
      );

      // Additional logic for handling the response, including JWT token handling as before

      return response.json(serviceResponse);
    } catch (error) {
      console.error('Error handling request:', error);
      throw error; // Or handle the error as you see fit
    }
  }
}
