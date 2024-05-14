import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Center } from '@app/database/entities/center.entity';
import { CreateCenterDto } from 'libs/dtos/centerDtos/create.center.dto';
import { UpdateCenterDto } from 'libs/dtos/centerDtos/update.center.dto';

@Injectable()
export class CenterRepository {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
  ) {}

  async count(): Promise<number> {
    return this.centerRepository.count();
  }

  async createCenter(createCenterDto: CreateCenterDto, front): Promise<Center> {
    const newCenter = this.centerRepository.create({
      longitude: createCenterDto.longitude,
      latitude: createCenterDto.latitude,
      front,
    });
    return this.centerRepository.save(newCenter);
  }

  async findOneWithFront(id: number): Promise<Center> {
    return this.centerRepository.findOne({
      where: { id },
      relations: ['front'],
    });
  }

  async findAll(): Promise<Center[]> {
    return this.centerRepository.find({
      select: ['id', 'latitude', 'longitude'],
      relations: ['front'],
    });
  }

  async findById(id: number): Promise<Center> {
    return this.centerRepository.findOne({ where: { id } });
  }

  async updateCenter(updateCenterDto: UpdateCenterDto): Promise<Center> {
    const center = await this.findOneWithFront(updateCenterDto.id);
    if (!center) {
      throw new NotFoundException(
        `Center not found with ID: ${updateCenterDto.id}`,
      );
    }

    center.latitude = updateCenterDto.latitude;
    center.longitude = updateCenterDto.longitude;

    return this.centerRepository.save(center);
  }

  async deleteCenter(id: number): Promise<void> {
    const deleteResult = await this.centerRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Center with ID ${id} not found`);
    }
  }

  async findCentersNearby(
    latitude: number,
    longitude: number,
    range: number,
  ): Promise<Center[]> {
    return this.centerRepository.find({
      where: {
        latitude: Between(latitude - range, latitude + range),
        longitude: Between(longitude - range, longitude + range),
      },
      relations: ['front'],
    });
  }

  async findCenterCoordinatesByFrontId(
    frontId: number,
  ): Promise<{ long: number; lat: number }> {
    const center = await this.centerRepository
      .createQueryBuilder('center')
      .innerJoin('center.front', 'front')
      .select(['center.latitude', 'center.longitude'])
      .where('front.id = :frontId', { frontId })
      .getOne();

    if (!center) {
      throw new NotFoundException('Center not found');
    }

    return { long: center.longitude, lat: center.latitude };
  }
}
