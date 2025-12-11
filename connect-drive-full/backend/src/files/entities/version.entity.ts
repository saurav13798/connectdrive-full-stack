import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FileEntity } from './file.entity';

@Entity('file_versions')
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  fileId!: string;

  @Column()
  versionNumber!: number;

  @Column()
  key!: string; // storage key in MinIO for this version

  @Column()
  filename!: string;

  @Column('bigint')
  size!: number;

  @Column()
  mime!: string;

  @Column({ nullable: true })
  uploadedBy!: string;

  @CreateDateColumn()
  uploadedAt!: Date;

  // Relations
  @ManyToOne(() => FileEntity, (file) => file.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file!: FileEntity;
}
