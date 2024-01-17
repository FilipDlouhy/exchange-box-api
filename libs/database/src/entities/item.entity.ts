import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
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
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, (user) => user.friends)
  @JoinColumn({ name: 'friend_id' })
  friend: User;

  @Column()
  weight: number = 0;

  @Column({ nullable: true })
  imageUrl: string;

  @OneToOne(() => Exchange, (exchange) => exchange.item)
  @JoinColumn({ name: 'exchange_id' })
  exchange: Exchange;
}
