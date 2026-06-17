import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() name: string;
  @Column({ default: '' }) email: string;
  @Column({ default: '' }) city: string;
  @Column({ unique: true }) phone: string;
  @Column() password: string; // bcrypt hash

  @CreateDateColumn() createdAt: Date;
}
