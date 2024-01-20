import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Front } from './entities/front.entity';
import { User } from './entities/user.entity';
import { Center } from './entities/center.entity';
import { Exchange } from './entities/exchange.entity';
import { Box } from './entities/box.entity';
import { Item } from './entities/item.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  database: process.env.MYSQL_DATABASE || 'exchangeBox',
  username: process.env.MYSQL_USERNAME || 'root',
  password: process.env.MYSQL_PASSWORD || 'randomrootpassword',
  entities: [Front, User, Center, Exchange, Box, Item],
  autoLoadEntities: true,
  synchronize: true,
};
