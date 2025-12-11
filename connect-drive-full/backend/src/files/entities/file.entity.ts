import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Folder } from './folder.entity';
import { FileVersion } from './version.entity';
import { Share } from './share.entity';
import { RecycleEntry } from './recycle.entity';

@Entity('files')
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  folderId!: string;

  @Column()
  key!: string; // storage key in MinIO

  @Column()
  filename!: string;

  @Column('bigint')
  size!: number;

  @Column()
  mime!: string;

  @Column({ default: 1 })
  currentVersion!: number;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ nullable: true })
  deletedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Folder, (folder) => folder.files, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folderId' })
  folder!: Folder;

  @OneToMany(() => FileVersion, (version) => version.file, { cascade: true })
  versions!: FileVersion[];

  @OneToMany(() => Share, (share) => share.file)
  shares!: Share[];

  @OneToMany(() => RecycleEntry, (recycle) => recycle.file)
  recycleEntries!: RecycleEntry[];
}
