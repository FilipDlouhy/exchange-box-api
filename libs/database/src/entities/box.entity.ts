import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm';
import { Front } from './front.entity';
import { Exchange } from './exchange.entity';

@Entity()
export class Box {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'date' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'date' })
  updatedAt: Date;

  @Column()
  boxOpenCode: string;

  @Column({ type: 'date' })
  timeToOpenCode: Date;

  @OneToOne(() => Front, { cascade: true })
  @JoinColumn()
  front: Front;

  @OneToOne(() => Exchange, { cascade: true })
  @JoinColumn()
  exchange: Exchange;

  @Column({ type: 'date' })
  timeToPutInBox: Date;

  @Column()
  openOrClosed: boolean;

  @Column()
  itemsInBox: boolean;
}
