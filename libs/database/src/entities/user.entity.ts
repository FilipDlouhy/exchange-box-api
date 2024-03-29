import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { Item } from './item.entity';
import { Exchange } from './exchange.entity';
import { Notification } from './notification.entity';
import { Event } from './event.entity';

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
  backgroundImageUrl: string;

  @Column({ nullable: true })
  address: string | null;

  @Column({ nullable: true })
  telephone: string | null;

  @Column({ type: 'float', nullable: true, default: 20 })
  longitude: number | null;

  @Column({ type: 'float', nullable: true, default: 20 })
  latitude: number | null;

  @ManyToMany(() => User, (user) => user.friends)
  @JoinTable()
  friends: User[];

  @OneToMany(() => Item, (item) => item.user)
  items: Item[];

  @OneToMany(() => Exchange, (exchange) => exchange.user)
  exchanges: Exchange[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];

  @OneToMany(() => Event, (event) => event.user)
  events: Event[];

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
