import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TeamMember } from './team-member.entity';
import { TeamFile } from './team-file.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  ownerId: string;

  @Column('bigint', { default: 53687091200 }) // 50GB default for teams
  storageQuota: number;

  @Column('bigint', { default: 0 })
  storageUsed: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => TeamMember, (member) => member.organization)
  members: TeamMember[];

  @OneToMany(() => TeamFile, (file) => file.organization)
  files: TeamFile[];
}