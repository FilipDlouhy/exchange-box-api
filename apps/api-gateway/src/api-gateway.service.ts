import { authMessagePatterns } from '@app/tcp/auth.messages.patterns';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { Request } from 'express';

@Injectable()
export class ApiGatewayService {
  private paymentServiceClient: ClientProxy;
  private authServiceClient: ClientProxy;
  private centerServiceClient: ClientProxy;
  private frontServiceClient: ClientProxy;
  private itemServiceClient: ClientProxy;
  private userServiceClient: ClientProxy;
  private exchangeClient: ClientProxy;
  private boxClient: ClientProxy;
  private chatClient: ClientProxy;
  private chatSupportClient: ClientProxy;

  constructor() {
    // Initializing different service clients with corresponding ports
    this.authServiceClient = this.createClient('auth', 3001);
    this.centerServiceClient = this.createClient('center', 3002);
    this.frontServiceClient = this.createClient('front', 3003);
    this.itemServiceClient = this.createClient('item', 3004);
    this.paymentServiceClient = this.createClient('payment', 3005);
    this.userServiceClient = this.createClient('user', 3006);
    this.exchangeClient = this.createClient('exchange', 3007);
    this.boxClient = this.createClient('box', 3008);
    this.chatClient = this.createClient('chat', 3009);
    this.chatClient = this.createClient('chatSupport', 3010);
  }

  /**
   * Parses the URL to determine the service and command to be used.
   * @param {string} url - The request URL.
   * @returns An array of URL parts or a string indicating an invalid format.
   */
  private parseUrl(url: string) {
    const parts = url.split('/').filter((part) => part !== '');

    if (parts.length >= 2) {
      return parts.length === 2
        ? [parts[0], parts[1]]
        : [parts[0], parts[1], parts[2]];
    } else {
      return 'Invalid URL format';
    }
  }

  /**
   * Converts kebab-case strings to camelCase.
   * @param {string} str - The string to be converted.
   * @returns The camelCase version of the input string.
   */
  private kebabToCamel(str: string) {
    return str.replace(/-([a-z])/g, function (match, letter) {
      return letter.toUpperCase();
    });
  }

  /**
   * Creates a ClientProxy for microservice communication.
   * @param {string} serviceName - The name of the service.
   * @param {number} port - The port number for the service.
   * @returns A ClientProxy instance configured for the specified service.
   */
  private createClient(serviceName: string, port: number): ClientProxy {
    return ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: port,
      },
    });
  }

  /**
   * Reroutes incoming requests to the appropriate microservice.
   * @param {Request} req - The incoming request object.
   * @returns The response from the targeted microservice.
   * @throws NotFoundException if the service is not found.
   */
  async rerouteRequest(req: Request, file?: Express.Multer.File) {
    if (req.path === '/auth/check-token') {
      return await this.handleCheckToken(req);
    }

    const requestUrl = this.parseUrl(req.path.toString());
    let client: ClientProxy | null = null;
    switch (requestUrl[0]) {
      case 'payment':
        client = this.paymentServiceClient;
        break;
      case 'auth':
        client = this.authServiceClient;
        break;
      case 'center':
        client = this.centerServiceClient;
        break;
      case 'front':
        client = this.frontServiceClient;
        break;
      case 'item':
        client = this.itemServiceClient;
        break;
      case 'user':
        client = this.userServiceClient;
        break;
      case 'exchange':
        client = this.exchangeClient;
        break;
      case 'box':
        client = this.boxClient;
        break;
      case 'chat':
        client = this.chatClient;
      case 'chatSupport':
        client = this.chatSupportClient;
        break;
      default:
        throw new NotFoundException('Service not found');
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      if (req.body && Object.keys(req.body).length > 0) {
        const response = file
          ? await client
              .send(
                { cmd: this.kebabToCamel(requestUrl[1]) },
                { ...req.body, file },
              )
              .toPromise()
          : await client
              .send({ cmd: this.kebabToCamel(requestUrl[1]) }, req.body)
              .toPromise();
        return response;
      } else {
        throw new Error('Request body is empty or invalid');
      }
    } else {
      const reqBody = requestUrl[2] ? { id: requestUrl[2] } : {};

      const response = await client
        .send({ cmd: this.kebabToCamel(requestUrl[1]) }, reqBody)
        .toPromise();
      return response;
    }
  }

  /**
   * Handles /auth/check-token route: Extracts and validates JWT token from cookies or headers.
   *
   * @param {Request} req - The incoming request object.
   * @returns {Promise} A promise resolving to the validation response.
   */
  private async handleCheckToken(req: Request): Promise<boolean> {
    if (req.path === '/auth/check-token') {
      // Extract JWT token from the request
      const token =
        req.cookies['jwt'] || req.headers['authorization']?.split(' ')[1];
      if (!token) {
        false;
      }

      // Call the AuthService to validate the token
      try {
        const isValid = await this.authServiceClient
          .send(
            { cmd: authMessagePatterns.checkJwtToken.cmd },
            { token: token },
          )
          .toPromise();

        return isValid;
      } catch (error) {
        console.error('Error validating token:', error);
        return false;
      }
    }

    // If the route is not /auth/check-token, return valid: false by default
    return false;
  }
}
