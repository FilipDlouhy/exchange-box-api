import { CenterDto } from 'libs/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from 'libs/dtos/centerDtos/center.with.front.dto';
import { CreateCenterDto } from 'libs/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from 'libs/dtos/centerDtos/update.center.dto';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import axios from 'axios';
import { GetCenterDto } from 'libs/dtos/centerDtos/get.center.dto';
import { FrontExchangeDto } from 'libs/dtos/frontDtos/front.exchange.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Center } from '@app/database/entities/center.entity';
import { Between, Repository } from 'typeorm';
import { frontManagementCommands } from '@app/tcp/frontMessagePatterns/front.management.message.patterns';
import { Front } from '@app/database';
import { FrontDto } from 'libs/dtos/frontDtos/front.dto';

@Injectable()
export class CenterService implements OnModuleInit {
  private readonly frontClient;
  private readonly overpassUrl = 'http://overpass-api.de/api/interpreter';

  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
  ) {
    this.frontClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3003,
      },
    });
  }

  /**
   * Initializes the module and performs data retrieval. It imitates creation of centers based on locations of macdonlads in Czech Republic.
   * This function is automatically executed when the module is initialized.
   */
  async onModuleInit() {
    try {
      // Define a bounding box for geographical coordinates for CZ
      const bbox = '48.378550,12.991661,50.835862,18.996826';

      // Check if data already exists using TypeORM
      const existingCenters = await this.centerRepository.count();
      if (existingCenters > 0) {
        return;
      }

      // Define a query to retrieve data from Overpass API
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

      // Process and save the data
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

  /**
   * Retrieves a specific center from the database, including its associated front.
   *
   * @param {number} id - The ID of the center to be retrieved.
   * @returns {Promise<CenterDto>} - Returns a promise that resolves to the center with its associated front.
   */
  async getCenter(id: number): Promise<CenterDto> {
    try {
      // Find the center with the specified id and join with the front entity
      const center = await this.centerRepository.findOne({
        where: { id },
        relations: ['front'], // Assuming 'front' is the correct relation name
      });

      if (!center) {
        throw new NotFoundException(`No center found with the given id: ${id}`);
      }

      // Prepare the CenterWithFrontDto
      const centerWithFrontDto = new CenterDto(
        center.latitude,
        center.longitude,
        center.id.toString(),
        center.front,
      );

      return centerWithFrontDto;
    } catch (err) {
      console.error('Error in getCenter function:', err);
      throw new InternalServerErrorException('Failed to retrieve the center');
    }
  }

  /**
   * Updates a center record in the database.
   *
   * @param {UpdateCenterDto} updateCenterDto - The data transfer object containing the center's updated information.
   */
  async updateCenter(updateCenterDto: UpdateCenterDto): Promise<CenterDto> {
    try {
      // First, find the center by ID
      const center = await this.centerRepository.findOne({
        where: { id: updateCenterDto.id },
        relations: ['front'], // Assuming 'front' is the name of the one-to-one relation with Front entity
      });

      if (!center) {
        throw new NotFoundException(
          `Center not found with ID: ${updateCenterDto.id}`,
        );
      }

      center.latitude = updateCenterDto.latitude;
      center.longitude = updateCenterDto.longitude;

      const updatedCenter = await this.centerRepository.save(center);
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

  /**
   * Retrieves an array of centers from the database.
   *
   * @returns {Promise<CenterDto[]>} - Returns a promise that resolves to an array of center data transfer objects (DTOs).
   */
  async getCenters(): Promise<CenterDto[]> {
    try {
      // Fetch all centers from the database using TypeORM
      const centers = await this.centerRepository.find({
        select: ['id', 'latitude', 'longitude'],
        relations: ['front'],
      });

      // Map the centers to DTOs if necessary
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

  /**
   * Deletes a center record from the database and deletes paired front from database because of  on cascade.
   *
   * @param {number} id - The ID of the center to be deleted.
   */
  async deleteCenter(id: number) {
    try {
      const deleteResult = await this.centerRepository.delete(id);

      if (deleteResult.affected === 0) {
        throw new NotFoundException(`Center with ID ${id} not found`);
      }
    } catch (error) {
      console.error('Error in deleteCenter function:', error);
      throw new InternalServerErrorException('Failed to delete the center');
    }
  }

  /**
   * Deletes a center record from the database. Due to the cascading delete setup in ,
   * this operation also deletes the associated 'front' record linked to the center.
   *
   * @param {number} id - The ID of the center to be deleted.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if the deletion
   *                               is successful, or `false` if there is an error.
   */
  async getCenterForExchange(
    getCenterDto: GetCenterDto,
  ): Promise<CenterWithFrontDto[]> {
    const { latitude, longitude } = getCenterDto;
    const range = 0.2;

    try {
      const potentialCenters = await this.centerRepository.find({
        where: {
          latitude: Between(latitude - range, latitude + range),
          longitude: Between(longitude - range, longitude + range),
        },
        relations: ['front'],
      });

      // Filter out centers with specific conditions
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
    const center = await this.centerRepository.findOne({
      where: {
        id: centerId,
      },
      relations: ['front'],
    });

    return center.front;
  }

  /**
   * Fetches center coordinates based on a given front ID.
   * @param {number} frontId - The ID of the front to find the center coordinates for.
   * @returns {Promise<{long: number; lat: number}>} Coordinates of the center.
   * @throws {Error} Throws an error if the center is not found.
   */
  async getCenterCoordinatsWithFrontId(
    frontId: number,
  ): Promise<{ long: number; lat: number }> {
    try {
      const center = await this.centerRepository
        .createQueryBuilder('center')
        .innerJoin('center.front', 'front')
        .select(['center.latitude', 'center.longitude'])
        .where('front.id = :frontId', { frontId })
        .getOne();

      if (!center) {
        throw new Error('Center not found');
      }

      return { long: center.longitude, lat: center.latitude };
    } catch (error) {
      console.error(
        `Failed to fetch center coordinates for front ID: ${frontId}`,
        error,
      );
      throw new Error('Failed to retrieve center coordinates');
    }
  }

  /**
   * Creates a new center in the database and initializes its associated front.
   *
   * @param {CreateCenterDto} createCenterDto - The DTO containing information for creating a new center.
   * @returns {Promise<CenterDto>} - Returns a promise that resolves to the newly created center data transfer object (DTO).
   */
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

      const newCenter = this.centerRepository.create({
        longitude: createCenterDto.longitude,
        latitude: createCenterDto.latitude,
        front: frontResponse,
      });

      const savedCenter = await this.centerRepository.save(newCenter);

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
