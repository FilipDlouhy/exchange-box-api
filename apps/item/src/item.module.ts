import { Module } from '@nestjs/common';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { DatabaseModule } from '@app/database';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from '@app/database/entities/item.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ItemRepository } from './item.repository';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Item]),
    CacheModule.register(),
    ItemRepository,
  ],
  controllers: [ItemController],
  providers: [ItemService],
})
export class ItemModule {}
