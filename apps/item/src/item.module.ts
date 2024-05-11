import { Module } from '@nestjs/common';
import { ItemController } from './item.controller';
import { ItemService } from './item.service';
import { Item } from '@app/database/entities/item.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { ItemRepository } from './item.repository';
import { CacheModule } from '@nestjs/cache-manager';
@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([Item]),
    CacheModule.register(),
  ],
  controllers: [ItemController],
  providers: [ItemService, ItemRepository],
})
export class ItemModule {}
