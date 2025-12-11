import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Organization } from './organization.entity';
import { FileEntity } from '../../files/entities/file.entity';

@Entity('team_files')
export class TeamFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @Column()
  organizationId: string;

  @Column()
  sharedById: string;

  @Column('text', { default: '{"read":true,"write":false,"delete":false}' })
  permissions: string; // JSON: { read, write, delete, share }

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  sharedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => FileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @ManyToOne(() => Organization, (org) => org.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sharedById' })
  sharedBy: User;
}