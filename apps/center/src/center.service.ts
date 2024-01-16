import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { CreateCenterDto } from '@app/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';
import { FrontDto } from '@app/dtos/frontDtos/front.dto';
import { supabase } from '@app/database';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import axios from 'axios';

@Injectable()
export class CenterService implements OnModuleInit {
  private readonly frontClient;
  private readonly overpassUrl = 'http://overpass-api.de/api/interpreter';

  constructor() {
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

      const { data, error } = await supabase
        .from('center')
        .select('id, latitude, longitude');

      if (error) {
        throw new Error(`Error fetching data from Supabase: ${error.message}`);
      }

      // If data already exists, no further action is required
      if (data.length > 0) {
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
   * Creates a new center in the database and initializes its associated front.
   *
   * @param {CreateCenterDto} createCenterDto - The DTO containing information for creating a new center.
   * @returns {Promise<CenterDto>} - Returns a promise that resolves to the newly created center data transfer object (DTO).
   */
  async createCenter(createCenterDto: CreateCenterDto): Promise<CenterDto> {
    try {
      const { data, error } = await supabase
        .from('center')
        .insert([
          {
            longitude: createCenterDto.longitude,
            latitude: createCenterDto.latitude,
            created_at: new Date(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating center:', error);
        throw new Error('Failed to create the center');
      }

      // Send a message to the front client to create a front associated with the new center
      const response = await this.frontClient
        .send(
          { cmd: frontMessagePatterns.createFront.cmd },
          { center_id: data.id },
        )
        .toPromise();

      // Check if the front creation was successful
      if (response === true) {
        const newCenter = new CenterDto(data.latitude, data.longitude, data.id);
        return newCenter;
      } else {
        console.error('Error creating associated front');
        throw new Error('Failed to create associated front');
      }
    } catch (err) {
      console.error('Error in createCenter function:', err);
      throw err;
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
      const { data, error } = await supabase
        .from('center')
        .select(
          `
        *,
        front!inner(*)
      `,
        )
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching center:', error);
        throw new Error('Failed to retrieve the center');
      }

      const frontObject: FrontDto =
        data.front && data.front.length > 0 ? data.front[0] : null;

      const centerDto: CenterWithFrontDto = { ...data, front: frontObject };

      return centerDto;
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
      const { data, error } = await supabase
        .from('center')
        .update({
          name: updateCenterDto.name,
        })
        .eq('id', updateCenterDto.id)
        .select(
          `
        *,
        front!inner(*)
      `,
        )
        .single();

      if (error) {
        console.error('Error updating center:', error);
        throw new Error('Failed to update the center');
      }

      const updatedCenter: CenterWithFrontDto = data;

      return updatedCenter;
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
      const { data, error } = await supabase
        .from('center')
        .select('id, latitude, longitude');

      if (error) {
        console.error('Error fetching centers:', error);
        throw new Error('Error retrieving centers');
      }

      return data;
    } catch (err) {
      console.error('Error in getCenters function:', err);
      throw new Error('Error retrieving centers');
    }
  }

  /**
   * Deletes a center record from the database and deletes paired front from database because of supabase on cascade.
   *
   * @param {number} id - The ID of the center to be deleted.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if the deletion is successful.
   */
  async deleteCenter(id: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('center')
        .delete()
        .match({ id });

      if (error) {
        console.error('Error deleting center:', error);
        throw new Error('Failed to delete the center');
      }

      return true;
    } catch (error) {
      console.error('Error in deleteCenter function:', error);
      throw error;
    }
  }
}
