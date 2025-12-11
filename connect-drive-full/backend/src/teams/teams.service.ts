import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { TeamMember, TeamRole } from './entities/team-member.entity';
import { TeamFile } from './entities/team-file.entity';
import { User } from '../auth/entities/user.entity';
import { FileEntity } from '../files/entities/file.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(TeamMember) private memberRepo: Repository<TeamMember>,
    @InjectRepository(TeamFile) private teamFileRepo: Repository<TeamFile>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(FileEntity) private fileRepo: Repository<FileEntity>,
  ) {}

  async createOrganization(ownerId: string, name: string, description?: string): Promise<Organization> {
    const org = this.orgRepo.create({
      name,
      description,
      ownerId,
      storageQuota: 53687091200, // 50GB for teams
      storageUsed: 0,
    });

    const savedOrg = await this.orgRepo.save(org);

    // Add owner as admin member
    await this.memberRepo.save({
      userId: ownerId,
      organizationId: savedOrg.id,
      role: TeamRole.OWNER,
    });

    return savedOrg;
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const memberships = await this.memberRepo.find({
      where: { userId, isActive: true },
      relations: ['organization'],
    });

    return memberships.map(m => m.organization);
  }

  async getOrganization(orgId: string, userId: string): Promise<Organization> {
    const membership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
      relations: ['organization'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return membership.organization;
  }

  async inviteUser(orgId: string, inviterId: string, email: string, role: TeamRole = TeamRole.MEMBER): Promise<TeamMember> {
    // Check if inviter has permission
    const inviterMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: inviterId, isActive: true },
    });

    if (!inviterMembership || (inviterMembership.role !== TeamRole.OWNER && inviterMembership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('You do not have permission to invite users');
    }

    // Find user by email
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user is already a member
    const existingMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: user.id },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new BadRequestException('User is already a member of this organization');
      } else {
        // Reactivate membership
        existingMembership.isActive = true;
        existingMembership.role = role;
        return this.memberRepo.save(existingMembership);
      }
    }

    // Create new membership
    const membership = this.memberRepo.create({
      userId: user.id,
      organizationId: orgId,
      role,
    });

    return this.memberRepo.save(membership);
  }

  async shareFileWithTeam(fileId: string, orgId: string, userId: string, permissions?: any): Promise<TeamFile> {
    // Verify user owns the file
    const file = await this.fileRepo.findOne({ where: { id: fileId, ownerId: userId } });
    if (!file) {
      throw new NotFoundException('File not found or you do not own this file');
    }

    // Verify user is member of organization
    const membership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    // Check if file is already shared with team
    const existingShare = await this.teamFileRepo.findOne({
      where: { fileId, organizationId: orgId, isActive: true },
    });

    if (existingShare) {
      throw new BadRequestException('File is already shared with this team');
    }

    const teamFile = this.teamFileRepo.create({
      fileId,
      organizationId: orgId,
      sharedById: userId,
      permissions: JSON.stringify(permissions || { read: true, write: false, delete: false, share: false }),
    });

    return this.teamFileRepo.save(teamFile);
  }

  async getTeamFiles(orgId: string, userId: string): Promise<any[]> {
    // Verify user is member of organization
    const membership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const teamFiles = await this.teamFileRepo.find({
      where: { organizationId: orgId, isActive: true },
      relations: ['file', 'sharedBy'],
      order: { sharedAt: 'DESC' },
    });

    return teamFiles.map(tf => ({
      id: tf.id,
      file: {
        id: tf.file.id,
        filename: tf.file.filename,
        size: tf.file.size,
        mime: tf.file.mime,
        createdAt: tf.file.createdAt,
      },
      sharedBy: {
        id: tf.sharedBy.id,
        displayName: tf.sharedBy.displayName,
        email: tf.sharedBy.email,
      },
      permissions: JSON.parse(tf.permissions),
      sharedAt: tf.sharedAt,
    }));
  }

  async getOrganizationMembers(orgId: string, userId: string): Promise<any[]> {
    // Verify user is member of organization
    const membership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId, isActive: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const members = await this.memberRepo.find({
      where: { organizationId: orgId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });

    return members.map(m => ({
      id: m.id,
      user: {
        id: m.user.id,
        displayName: m.user.displayName,
        email: m.user.email,
      },
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async removeUserFromOrganization(orgId: string, targetUserId: string, requesterId: string): Promise<void> {
    // Check requester permissions
    const requesterMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || (requesterMembership.role !== TeamRole.OWNER && requesterMembership.role !== TeamRole.ADMIN)) {
      throw new ForbiddenException('You do not have permission to remove users');
    }

    // Cannot remove owner
    const targetMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: targetUserId, isActive: true },
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    if (targetMembership.role === TeamRole.OWNER) {
      throw new BadRequestException('Cannot remove organization owner');
    }

    // Deactivate membership
    targetMembership.isActive = false;
    await this.memberRepo.save(targetMembership);
  }

  async updateMemberRole(orgId: string, targetUserId: string, newRole: TeamRole, requesterId: string): Promise<TeamMember> {
    // Check requester permissions
    const requesterMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || requesterMembership.role !== TeamRole.OWNER) {
      throw new ForbiddenException('Only organization owners can change member roles');
    }

    const targetMembership = await this.memberRepo.findOne({
      where: { organizationId: orgId, userId: targetUserId, isActive: true },
    });

    if (!targetMembership) {
      throw new NotFoundException('User is not a member of this organization');
    }

    if (targetMembership.role === TeamRole.OWNER && newRole !== TeamRole.OWNER) {
      throw new BadRequestException('Cannot change owner role');
    }

    targetMembership.role = newRole;
    return this.memberRepo.save(targetMembership);
  }
}