import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';
import { User } from '../../auth/entities/user.entity';

export enum ShareLinkPermission {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
}

@Entity('file_share_links')
export class FileShareLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileId: string;

  @Column()
  createdBy: string;

  @Column({ unique: true })
  token: string;

  @Column({
    type: 'varchar',
    default: ShareLinkPermission.VIEW,
  })
  permission: ShareLinkPermission;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: 0 })
  accessCount: number;

  @Column({ nullable: true })
  maxAccess: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => FileEntity)
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}