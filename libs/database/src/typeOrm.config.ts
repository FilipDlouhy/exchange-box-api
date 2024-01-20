import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Front } from './entities/front.entity';
import { User } from './entities/user.entity';
import { Center } from './entities/center.entity';
import { Exchange } from './entities/exchange.entity';
import { Box } from './entities/box.entity';
import { Item } from './entities/item.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: '127.0.0.1', // Use the environment variable or default to '127.0.0.1'
  port: 3306, // Use the environment variable or default to 3306
  database: 'nestjs_typeorm', // Use the environment variable or default to 'nestjs_typeorm'
  username: 'root', // Use the environment variable or default to 'root'
  password: 'randomrootpassword', // Use the environment variable or default to 'randomrootpassword'
  entities: [Front, User, Center, Exchange, Box, Item],
  autoLoadEntities: true,
  synchronize: true,
};
