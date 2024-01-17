// common/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Front } from './entities/front.entity';
import { User } from './entities/user.entity';
import { Center } from './entities/center.entity';
import { Task } from './entities/task.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'mysql',
  host: 'mysql',
  port: 3306,
  username: 'root',
  password: 'rootpassword',
  database: 'mydb',
  entities: [Front, User, Center, Task],
  synchronize: true,
  driver: require('mysql2'),
};
