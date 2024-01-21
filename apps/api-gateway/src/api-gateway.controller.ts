import {
  Controller,
  All,
  Req,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiGatewayService } from './api-gateway.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('*')
  @UseInterceptors(FileInterceptor('image', { storage: memoryStorage() }))
  async handleRequest(
    @Req() req: Request,
    @Res() response: Response,
    @UploadedFile() file,
  ) {
    try {
      const serviceResponse = await this.apiGatewayService.rerouteRequest(
        req,
        file,
      );

      // Check if it's a login response with a JWT token
      if (req.path === '/auth/login' && serviceResponse.access_token) {
        response.cookie('jwt', serviceResponse.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }

      return response.json(serviceResponse);
    } catch (error) {
      console.error('Error handling request:', error);
      throw error; // Or handle the error as you see fit
    }
  }
}
