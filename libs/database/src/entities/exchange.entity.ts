import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Front } from './front.entity';

@Entity()
export class Exchange {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'date' })
  pickUpDate: Date;

  @Column()
  price: number;

  @Column({ type: 'date' })
  timeElapsedSincePickUpDate: Date;

  @ManyToOne(() => User, (user) => user.exchanges)
  user: User;

  @OneToOne(() => User, { cascade: true })
  @JoinColumn()
  friend: User;

  @Column()
  pickUpCode: string;

  @Column()
  boxSize: string;

  @Column()
  exchangeState: string;

  @OneToOne(() => Front, { cascade: true })
  @JoinColumn()
  front: Front;
}
