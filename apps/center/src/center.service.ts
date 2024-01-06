import { CenterDto } from '@app/dtos/centerDtos/center.dto';
import { CenterWithFrontDto } from '@app/dtos/centerDtos/center.with.front.dto';
import { CreateCenterDto } from '@app/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from '@app/dtos/centerDtos/update.center.dto';
import { FrontDto } from '@app/dtos/frontDtos/front.dto';
import { supabase } from '@app/tables';
import { frontMessagePatterns } from '@app/tcp/front.message.patterns';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class CenterService {
  private readonly frontClient;
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
            name: createCenterDto.name,
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
        const newCenter = new CenterDto(data.name, data.id);
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
      const { data, error } = await supabase.from('center').select('id, name');

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
   * Deletes a center record from the database.
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
