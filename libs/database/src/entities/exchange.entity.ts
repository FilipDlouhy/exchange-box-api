import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Front } from './front.entity';
import { Item } from './item.entity';
import { Box } from './box.entity';

@Entity()
export class Exchange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'date', nullable: true })
  pickUpDate: Date;

  @Column({ nullable: true })
  price: number;

  @Column({ type: 'date', nullable: true })
  timeElapsedSincePickUpDate: Date;

  @OneToMany(() => Item, (item) => item.exchange)
  items: Item[];

  @ManyToOne(() => User, { cascade: true })
  @JoinColumn()
  friend: User;

  @ManyToOne(() => User, { cascade: true })
  @JoinColumn()
  user: User;

  @Column({ nullable: true })
  pickUpCode: string;

  @Column()
  boxSize: string;

  @Column()
  name: string;

  @Column()
  exchangeState: string;

  @OneToOne(() => Box, { cascade: true })
  @JoinColumn()
  box: Box;

  @ManyToOne(() => Front, (front) => front.exchanges)
  front: Front;
}
