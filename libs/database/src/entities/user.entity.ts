import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Item } from './item.entity'; // Corrected the import statement
import { Exchange } from './exchange.entity'; // Corrected the import statement

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  password: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('text', { array: true, nullable: true })
  friends: string[];

  @OneToMany(() => Item, (item) => item.user, { cascade: true })
  items: Item[];

  @OneToMany(() => Exchange, (exchange) => exchange.user, { cascade: true })
  exchanges: Exchange[];

  constructor(user: Partial<User>) {
    Object.assign(this, user);
  }
}
