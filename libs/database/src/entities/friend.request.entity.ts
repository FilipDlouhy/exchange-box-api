import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userName: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expirationDate: Date;

  @Column()
  friendId: number;

  @Column()
  userId: number;

  @Column({ type: 'boolean', nullable: true })
  accepted: boolean | null;

  @Column({ nullable: true })
  friendImageUrl: string;
}
