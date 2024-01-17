import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Front } from './front.entity';

@Entity()
export class Center {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Front, { cascade: true })
  @JoinColumn()
  front: Front;

  @Column({ type: 'float', nullable: true })
  longitude: number;

  @Column({ type: 'float', nullable: true })
  latitude: number;

  constructor(center: Partial<Center>) {
    Object.assign(this, center);
  }
}
