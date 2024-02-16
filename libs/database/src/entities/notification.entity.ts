import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nameOfTheService: string;

  @Column()
  initials: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column()
  text: string;

  @Column({ default: false })
  seen: boolean;

  @ManyToOne(() => User, (user) => user.items)
  @JoinColumn({ name: 'userId' })
  user: User;

  constructor(notification: Partial<Notification>) {
    Object.assign(this, notification);
  }
}
