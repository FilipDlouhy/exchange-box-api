import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import axios from 'axios';
import { CenterRepository } from './center.repository';
import { CenterDto } from 'libs/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from 'libs/dtos/centerDtos/center.with.front.dto';
import { CreateCenterDto } from 'libs/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from 'libs/dtos/centerDtos/update.center.dto';
import { GetCenterDto } from 'libs/dtos/centerDtos/get.center.dto';
import { FrontExchangeDto } from 'libs/dtos/frontDtos/front.exchange.dto';
import { FrontDto } from 'libs/dtos/frontDtos/front.dto';
import { Front } from '@app/database';
import { frontManagementCommands } from '@app/tcp/frontMessagePatterns/front.management.message.patterns';

@Injectable()
export class CenterService implements OnModuleInit {
  private readonly frontClient;
  private readonly overpassUrl = 'http://overpass-api.de/api/interpreter';

  constructor(private readonly centerRepository: CenterRepository) {
    this.frontClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    });
  }

  async onModuleInit() {
    try {
      const bbox = '48.378550,12.991661,50.835862,18.996826';

      const existingCenters = await this.centerRepository.count();
      if (existingCenters > 0) {
        return;
      }

      const query = `
        [out:json];
        (
          node["amenity"="fast_food"]["name"="McDonald's"](${bbox});
          way["amenity"="fast_food"]["name"="McDonald's"](${bbox});
          relation["amenity"="fast_food"]["name"="McDonald's"](${bbox});
        );
        out center;
      `;

      const response = await axios.post(this.overpassUrl, query, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (response.status !== 200) {
        throw new Error(
          `Error fetching data from Overpass API. Status: ${response.status}`,
        );
      }

      response.data.elements.map(async (center) => {
        try {
          let newCenterDto;

          if (center.center) {
            newCenterDto = new CreateCenterDto(
              center.center.lat,
              center.center.lon,
            );
          } else {
            newCenterDto = new CreateCenterDto(center.lat, center.lon);
          }

          await this.createCenter(newCenterDto);
        } catch (error) {
          console.error('Error creating center DTO:', error);
        }
      });
    } catch (error) {
      console.error('Error in onModuleInit:', error);
    }
  }

  async getCenter(id: number): Promise<CenterDto> {
    try {
      const center = await this.centerRepository.findOneWithFront(id);

      if (!center) {
        throw new NotFoundException(`No center found with the given id: ${id}`);
      }

      const centerWithFrontDto = new CenterDto(
        center.latitude,
        center.longitude,
        center.id.toString(),
        new FrontDto(center.front),
      );

      return centerWithFrontDto;
    } catch (err) {
      console.error('Error in getCenter function:', err);
      throw new InternalServerErrorException('Failed to retrieve the center');
    }
  }

  async updateCenter(updateCenterDto: UpdateCenterDto): Promise<CenterDto> {
    try {
      const updatedCenter =
        await this.centerRepository.updateCenter(updateCenterDto);
      const centerWithFrontDto = new CenterDto(
        updatedCenter.latitude,
        updatedCenter.longitude,
        updatedCenter.id.toString(),
        new FrontDto(updatedCenter.front),
      );

      return centerWithFrontDto;
    } catch (err) {
      console.error('Error in updateCenter function:', err);
      throw new InternalServerErrorException('Failed to update the center');
    }
  }

  async getCenters(): Promise<CenterDto[]> {
    try {
      const centers = await this.centerRepository.findAll();

      const centerDtos = centers.map(
        (center) =>
          new CenterDto(
            center.longitude,
            center.latitude,
            center.id.toString(),
            new FrontDto(center.front),
          ),
      );

      return centerDtos;
    } catch (err) {
      console.error('Error in getCenters function:', err);
      throw new InternalServerErrorException('Failed to retrieve centers');
    }
  }

  async deleteCenter(id: number) {
    try {
      await this.centerRepository.deleteCenter(id);
    } catch (error) {
      console.error('Error in deleteCenter function:', error);
      throw new InternalServerErrorException('Failed to delete the center');
    }
  }

  async getCenterForExchange(
    getCenterDto: GetCenterDto,
  ): Promise<CenterWithFrontDto[]> {
    const { latitude, longitude } = getCenterDto;
    const range = 0.2;

    try {
      const potentialCenters = await this.centerRepository.findCentersNearby(
        latitude,
        longitude,
        range,
      );

      const filteredData = potentialCenters.filter((center) => {
        return (
          center.front.numberOfLargeBoxes !==
            center.front.numberOfLargeBoxesTotal &&
          center.front.numberOfSmallBoxes !==
            center.front.numberOfSmallBoxesTotal &&
          center.front.numberOfMediumBoxes !==
            center.front.numberOfMediumBoxesTotal &&
          center.front.totalNumberOfTasks !== center.front.numberOfTasksInFront
        );
      });

      const centersNearBy = filteredData.map((center) => {
        const frontObject = new FrontExchangeDto(
          center.front.id,
          center.front.numberOfLargeBoxesTotal -
            center.front.numberOfLargeBoxes,
          center.front.numberOfSmallBoxesTotal -
            center.front.numberOfSmallBoxes,
          center.front.numberOfMediumBoxesTotal -
            center.front.numberOfMediumBoxes,
        );
        const centerDto: CenterWithFrontDto = {
          id: center.id.toString(),
          latitude: center.latitude,
          longitude: center.longitude,
          front: frontObject,
        };
        return centerDto;
      });

      if (centersNearBy.length === 0) {
        throw new NotFoundException('No matching centers found');
      }

      return centersNearBy;
    } catch (err) {
      console.error('Error in getCenterForExchange function:', err);
      throw new InternalServerErrorException(
        'Failed to fetch centers for exchange',
      );
    }
  }

  async getCenterByCoordinates(centerId: number): Promise<Front> {
    const center = await this.centerRepository.findOneWithFront(centerId);
    return center.front;
  }

  async getCenterCoordinatsWithFrontId(
    frontId: number,
  ): Promise<{ long: number; lat: number }> {
    try {
      return await this.centerRepository.findCenterCoordinatesByFrontId(
        frontId,
      );
    } catch (error) {
      console.error(
        `Failed to fetch center coordinates for front ID: ${frontId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to retrieve center coordinates',
      );
    }
  }

  private async createCenter(
    createCenterDto: CreateCenterDto,
  ): Promise<CenterDto> {
    try {
      const frontResponse = await this.frontClient
        .send({ cmd: frontManagementCommands.createFront.cmd }, {})
        .toPromise();

      if (!frontResponse || !frontResponse.id) {
        console.error('Error creating front');
        throw new NotFoundException('Failed to create front');
      }

      const savedCenter = await this.centerRepository.createCenter(
        createCenterDto,
        frontResponse,
      );

      if (!savedCenter || !savedCenter.id) {
        console.error('Error saving center');
        throw new InternalServerErrorException('Failed to save center');
      }

      return new CenterDto(
        savedCenter.latitude,
        savedCenter.longitude,
        savedCenter.id.toString(),
        new FrontDto(frontResponse),
      );
    } catch (err) {
      console.error('Error in createCenter function:', err);
      throw new InternalServerErrorException('Failed to create center');
    }
  }
}
