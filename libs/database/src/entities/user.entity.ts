import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { Item } from './item.entity'; // Corrected the import statement
import { Exchange } from './exchange.entity'; // Corrected the import statement

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  address: string | null;

  @Column({ nullable: true })
  telephone: string | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @ManyToMany(() => User, (user) => user.friends)
  @JoinTable()
  friends: User[];

  @OneToMany(() => Item, (item) => item.user)
  items: Item[];

  @OneToMany(() => Exchange, (exchange) => exchange.user)
  exchanges: Exchange[];

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
