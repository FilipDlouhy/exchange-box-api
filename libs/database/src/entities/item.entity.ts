import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Exchange } from './exchange.entity'; // Import your Exchange entity

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  length: number = 0;

  @Column()
  width: number = 0;

  @Column()
  height: number = 0;

  @Column()
  name: string = '';

  @ManyToOne(() => User, (user) => user.items)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => User, (user) => user.friends)
  @JoinColumn({ name: 'friendId' })
  friend: User;

  @Column()
  weight: number = 0;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToOne(() => Exchange, (exchange) => exchange.items)
  @JoinColumn({ name: 'exchangeId' })
  exchange: Exchange;
}
