import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';
import { Folder } from './folder.entity';

@Entity('recycle_bin')
export class RecycleEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  fileId!: string;

  @Column({ nullable: true })
  folderId!: string;

  @Column()
  itemName!: string;

  @Column()
  itemType!: 'file' | 'folder';

  @Column({ nullable: true })
  originalPath!: string;

  @Column('bigint')
  size!: number;

  @Column()
  deletedBy!: string;

  @CreateDateColumn()
  deletedAt!: Date;

  @Column()
  expiresAt!: Date; // 30 days after deletion

  // Relations
  @ManyToOne(() => FileEntity, (file) => file.recycleEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file!: FileEntity;

  @ManyToOne(() => Folder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'folderId' })
  folder!: Folder;
}
