import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrganizationMember } from './organization-member.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column()
  ownerId!: string;

  @Column({ default: 'active' })
  status!: string;

  @Column({ type: 'bigint', default: 107374182400 }) // 100GB default
  storageQuota!: number;

  @Column({ type: 'bigint', default: 0 })
  storageUsed!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => OrganizationMember, member => member.organization)
  members!: OrganizationMember[];
}