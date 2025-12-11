import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { FileEntity } from './file.entity';
import { Folder } from './folder.entity';

@Entity('shares')
export class Share {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  fileId!: string;

  @Column({ nullable: true })
  folderId!: string;

  @Column()
  createdById!: string;

  @Column({ unique: true })
  shareToken!: string;

  @Column('text', { default: '{"read":true,"write":false,"delete":false}' })
  permissions!: string;

  @Column({ default: false })
  isPublic!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @ManyToOne(() => FileEntity, (file) => file.shares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file!: FileEntity;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folderId' })
  folder!: Folder;
}
