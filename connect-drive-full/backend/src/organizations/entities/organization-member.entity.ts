import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from '../../auth/entities/user.entity';

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

@Entity('organization_members')
export class OrganizationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  organizationId!: string;

  @Column()
  userId!: string;

  @Column({
    type: 'varchar',
    default: MemberRole.MEMBER,
  })
  role!: MemberRole;

  @Column({ default: 'active' })
  status!: string;

  @Column({ nullable: true })
  invitedBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Organization, organization => organization.members)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}