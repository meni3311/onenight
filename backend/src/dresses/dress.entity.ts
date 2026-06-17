import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type DressStatus = 'pending' | 'approved' | 'rejected';

@Entity('dresses')
export class Dress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() title: string;
  @Column({ type: 'text', default: '' }) desc: string;
  @Column({ default: '' }) color: string;
  @Column({ default: '#C4A0A0' }) colorHex: string;
  @Column({ default: '' }) condition: string;
  @Column({ default: '' }) length: string;
  @Column({ type: 'integer', default: 0 }) price: number;
  @Column({ default: '' }) region: string;
  @Column({ default: '' }) size: string;
  @Column({ default: '' }) source: string;
  @Column({ default: '' }) store: string;
  @Column({ default: '' }) phone: string;
  @Column({ default: '' }) email: string;

  @Column({ default: 'pending' }) status: DressStatus;
  @Column({ default: '' }) rejectReason: string;

  // Stored as JSON text in SQLite
  @Column({ type: 'simple-json', default: '[]' }) images: string[];
  @Column({ type: 'simple-json', default: '[]' }) booked: string[];

  @CreateDateColumn() createdAt: Date;
}
