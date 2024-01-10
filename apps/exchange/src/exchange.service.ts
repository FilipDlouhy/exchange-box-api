import { CreateExchangeDto } from '@app/dtos/exchangeDtos/create.exchange.dto';
import { ExchangeDto } from '@app/dtos/exchangeDtos/exchange.dto';
import { ItemDto } from '@app/dtos/itemDtos/item.dto';
import { ItemSizeDto } from '@app/dtos/itemDtos/item.size.dto';
import { supabase } from '@app/tables';
import { boxSizes } from '@app/tables/box.sizes';
import { exchnageStatus } from '@app/tables/exchange.status.dto';
import { itemMessagePatterns } from '@app/tcp/item.messages.patterns';
import { Injectable } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class ExchangeService {
  private readonly userClient;
  private readonly itemClient;

  constructor() {
    this.userClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3006,
      },
    });

    this.itemClient = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3004,
      },
    });
  }

  async createExchange(
    createExchangeDto: CreateExchangeDto,
  ): Promise<ExchangeDto> {
    try {
      const itemSizes = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.retrieveItemSizesAndCheckExchange.cmd },
          { item_ids: createExchangeDto.item_ids },
        )
        .toPromise();

      const boxSize = boxSizes[createExchangeDto.box_size];
      if (!this.checkItemsFitInBox(itemSizes, boxSize)) {
        throw new Error('Items do not fit in the specified box size.');
      }

      const { data, error: insertError } = await supabase
        .from('exchange')
        .insert([
          {
            creator_id: createExchangeDto.creator_id,
            pick_up_user_id: createExchangeDto.pick_up_person_id,
            exchange_state: exchnageStatus.unscheduled,
            box_size: createExchangeDto.box_size,
          },
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const items: ItemDto[] = await this.itemClient
        .send(
          { cmd: itemMessagePatterns.addExchangeId.cmd },
          {
            item_ids: createExchangeDto.item_ids,
            exchange_id: data.id,
          },
        )
        .toPromise();
      const newExchange = new ExchangeDto(
        data.creator_id,
        data.pick_up_user_id,
        data.box_size,
        items,
        data.id,
      );

      return newExchange;
    } catch (err) {
      console.error('Error creating exchange:', err);
      throw err;
    }
  }

  /**
   * Checks if the total dimensions of the items fit within the specified box size.
   *
   * @param itemSizes Array of item sizes.
   * @param boxSize Size of the box to compare against.
   * @returns boolean Returns true if items fit in the box, false otherwise.
   */
  private checkItemsFitInBox(itemSizes: ItemSizeDto[], boxSize): boolean {
    const { heightToCompare, widthToCompare, lengthToCompare } =
      itemSizes.reduce(
        (acc, itemSize) => {
          acc.heightToCompare += itemSize.height;
          acc.lengthToCompare += itemSize.length;
          acc.widthToCompare += itemSize.width;
          return acc;
        },
        { heightToCompare: 0, widthToCompare: 0, lengthToCompare: 0 },
      );
    return (
      boxSize.height >= heightToCompare &&
      boxSize.width >= widthToCompare &&
      boxSize.length >= lengthToCompare
    );
  }
}
