import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() name: string;
  // Email is the sole login/ownership identifier (see dress ownership
  // matching) — unique, required. Previously `phone` held this role; that
  // constraint moved here and phone is now plain contact info.
  @Column({ unique: true }) email: string;
  @Column({ default: '' }) phone: string;
  // Display-only handle, never used for login/lookup. Nullable so it's an
  // additive column against any pre-existing rows.
  @Column({ type: 'varchar', nullable: true }) username: string | null;
  @Column({ default: '' }) city: string;
  @Column() password: string; // bcrypt hash — never store/log the plaintext
  // Flips to true once the post-registration OTP is verified. Defaulted so
  // the column is additive against any pre-existing rows.
  @Column({ default: false }) verified: boolean;
  // Opt-out marketing consent, captured from the registration form's
  // (checked-by-default) checkbox. Stored for future use in email
  // campaigns — not read anywhere yet.
  @Column({ default: true }) marketingConsent: boolean;

  @CreateDateColumn() createdAt: Date;
}
