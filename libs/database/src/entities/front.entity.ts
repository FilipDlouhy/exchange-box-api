import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';

import { Exchange } from './exchange.entity';

@Entity()
export class Front {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  number_of_tasks_in_front: number;

  @Column()
  total_number_of_tasks: number;

  @Column()
  total_number_of_large_boxes: number;

  @Column()
  total_number_of_medium_boxes: number;

  @Column()
  total_number_of_small_boxes: number;

  @Column()
  total_number_of_large_boxes_total: number;

  @Column()
  total_number_of_medium_boxes_total: number;

  @Column()
  total_number_of_small_boxes_total: number;

  @OneToMany(() => Exchange, (exchange) => exchange.front, { cascade: true })
  exchanges: Exchange[];

  @UpdateDateColumn()
  updated_at: Date;

  constructor(front: Partial<Front>) {
    Object.assign(this, front);
  }
}
