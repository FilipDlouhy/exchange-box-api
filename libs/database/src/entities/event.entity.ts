import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'datetime' })
  fromTime: Date;

  @Column({ type: 'datetime' })
  toTime: Date;

  @Column()
  eventName: string;

  @Column()
  eventDescription: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.events)
  user: User;
}
