import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FileEntity } from '../../files/entities/file.entity';
import { Folder } from '../../files/entities/folder.entity';
import { Share } from '../../files/entities/share.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  displayName!: string;

  @Column('bigint', { default: 5368709120 }) // 5GB in bytes
  storageQuota!: number;

  @Column('bigint', { default: 0 })
  storageUsed!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @OneToMany(() => FileEntity, (file) => file.owner)
  files!: FileEntity[];

  @OneToMany(() => Folder, (folder) => folder.owner)
  folders!: Folder[];

  @OneToMany(() => Share, (share) => share.createdBy)
  shares!: Share[];
}
