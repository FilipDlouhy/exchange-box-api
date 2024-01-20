import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Box {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  boxOpenCode: string;

  @Column({ type: 'datetime', nullable: true })
  timeToPutInBox: Date;

  @Column({ default: false })
  openOrClosed: boolean;

  @Column({ default: false })
  itemsInBox: boolean;
}
