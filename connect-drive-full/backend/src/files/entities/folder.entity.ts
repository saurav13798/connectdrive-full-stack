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
import { FileEntity } from './file.entity';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  ownerId!: string;

  @Column({ nullable: true })
  parentId!: string;

  @Column({ default: false })
  isDeleted!: boolean;

  @Column({ nullable: true })
  deletedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.folders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Folder, (folder) => folder.children, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parentId' })
  parent!: Folder;

  @OneToMany(() => Folder, (folder) => folder.parent)
  children!: Folder[];

  @OneToMany(() => FileEntity, (file) => file.folder)
  files!: FileEntity[];
}
