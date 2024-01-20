import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { CreateCenterDto } from '@app/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import axios from 'axios';
import { GetCenterDto } from '@app/dtos/centerDtos/get.center.dto';
import { FrontExchangeDto } from '@app/dtos/frontDtos/front.exchange.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Center } from '@app/database/entities/center.entity';
import { Between, EntityManager, Repository } from 'typeorm';

@Injectable()
export class CenterService implements OnModuleInit {
  private readonly frontClient;
  private readonly overpassUrl = 'http://overpass-api.de/api/interpreter';

  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
    private readonly entityManager: EntityManager,
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
   * @returns {Promise<CenterWithFrontDto>} - Returns a promise that resolves to the center with its associated front.
   */
  async getCenter(id: number): Promise<CenterWithFrontDto> {
    try {
      // Find the center with the specified id and join with the front entity
      const center = await this.centerRepository.findOne({
        where: { id },
        relations: ['front'], // Assuming 'front' is the correct relation name
      });

      if (!center) {
        console.error('No center found with the given id:', id);
        throw new Error('Failed to retrieve the center');
      }

      // Prepare the CenterWithFrontDto
      const centerWithFrontDto = new CenterWithFrontDto(
        center.latitude,
        center.longitude,
        center.id.toString(),
        center.front,
      );

      return centerWithFrontDto;
    } catch (err) {
      console.error('Error in getCenter function:', err);
      throw err;
    }
  }

  /**
   * Updates a center record in the database.
   *
   * @param {UpdateCenterDto} updateCenterDto - The data transfer object containing the center's updated information.
   * @returns {Promise<CenterWithFrontDto>} - Returns a promise that resolves to the updated center, including its associated front.
   */

  async updateCenter(
    updateCenterDto: UpdateCenterDto,
  ): Promise<CenterWithFrontDto> {
    try {
      // First, find the center by ID
      const center = await this.centerRepository.findOne({
        where: { id: updateCenterDto.id },
        relations: ['front'], // Assuming 'front' is the name of the one-to-one relation with Front entity
      });

      if (!center) {
        console.error('No center found with the given id:', updateCenterDto.id);
        throw new Error('Center not found');
      }

      center.latitude = updateCenterDto.latitude;
      center.longitude = updateCenterDto.longitude;

      const updatedCenter = await this.centerRepository.save(center);
      const centerWithFrontDto = new CenterWithFrontDto(
        updatedCenter.latitude,
        updatedCenter.longitude,
        updatedCenter.id.toString(),
        updatedCenter.front,
      );

      return centerWithFrontDto;
    } catch (err) {
      console.error('Error in updateCenter function:', err);
      throw err;
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
        select: ['id', 'latitude', 'longitude'], // Select specific fields
      });

      // Map the centers to DTOs if necessary
      const centerDtos = centers.map(
        (center) =>
          new CenterDto(
            center.longitude,
            center.latitude,
            center.id.toString(),
          ),
      );

      return centerDtos;
    } catch (err) {
      console.error('Error in getCenters function:', err);
      throw new Error('Error retrieving centers');
    }
  }

  /**
   * Deletes a center record from the database and deletes paired front from database because of  on cascade.
   *
   * @param {number} id - The ID of the center to be deleted.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if the deletion is successful.
   */
  async deleteCenter(id: number): Promise<boolean> {
    try {
      const deleteResult = await this.centerRepository.delete(id);

      if (deleteResult.affected === 0) {
        console.error('No center found with the given id:', id);
        throw new Error('Failed to delete the center');
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCenter function:', error);
      throw error;
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

      // Filter out centers whose 'front' does not have a matching number of tasks in front and total number of tasks
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

      return centersNearBy;
    } catch (err) {
      console.error('Error:', err);
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
        .send({ cmd: frontMessagePatterns.createFront.cmd }, {})
        .toPromise();

      if (!frontResponse || !frontResponse.id) {
        console.error('Error creating front');
        throw new Error('Failed to create front');
      }

      const newCenter = this.centerRepository.create({
        longitude: createCenterDto.longitude,
        latitude: createCenterDto.latitude,
        front: frontResponse,
      });

      const savedCenter = await this.centerRepository.save(newCenter);

      return new CenterDto(
        savedCenter.latitude,
        savedCenter.longitude,
        savedCenter.id.toString(),
      );
    } catch (err) {
      console.error('Error in createCenter function:', err);
      throw err;
    }
  }
}
