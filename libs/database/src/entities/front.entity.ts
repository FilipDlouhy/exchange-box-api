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
  numberOfTasksInFront: number;

  @Column()
  totalNumberOfTasks: number;

  @Column({ default: 0, nullable: true })
  numberOfLargeBoxes: number;

  @Column({ default: 0, nullable: true })
  numberOfMediumBoxes: number;

  @Column({ default: 0, nullable: true })
  numberOfSmallBoxes: number;

  @Column()
  numberOfLargeBoxesTotal: number;

  @Column()
  numberOfMediumBoxesTotal: number;

  @Column()
  numberOfSmallBoxesTotal: number;

  @OneToMany(() => Exchange, (exchange) => exchange.front, {
    cascade: ['remove'],
  })
  exchanges: Exchange[];

  @UpdateDateColumn()
  updatedAt: Date;

  constructor(front: Partial<Front>) {
    Object.assign(this, front);
  }
}
