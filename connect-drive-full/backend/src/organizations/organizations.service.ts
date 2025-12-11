import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMember, MemberRole } from './entities/organization-member.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationMember)
    private memberRepository: Repository<OrganizationMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(ownerId: string, name: string, description?: string): Promise<Organization> {
    const organization = this.organizationRepository.create({
      name,
      description,
      ownerId,
    });

    const savedOrg = await this.organizationRepository.save(organization);

    // Add owner as admin member
    await this.addMember(savedOrg.id, ownerId, MemberRole.OWNER, ownerId);

    return savedOrg;
  }

  async findByUser(userId: string): Promise<Organization[]> {
    const members = await this.memberRepository.find({
      where: { userId, status: 'active' },
      relations: ['organization'],
    });

    return members.map(member => member.organization);
  }

  async findOne(id: string): Promise<Organization> {
    const organization = await this.organizationRepository.findOne({
      where: { id },
      relations: ['members', 'members.user'],
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: MemberRole = MemberRole.MEMBER,
    invitedBy: string,
  ): Promise<OrganizationMember> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.memberRepository.findOne({
      where: { organizationId, userId },
    });

    if (existingMember) {
      if (existingMember.status === 'active') {
        throw new ForbiddenException('User is already a member');
      }
      // Reactivate if previously removed
      existingMember.status = 'active';
      existingMember.role = role;
      return this.memberRepository.save(existingMember);
    }

    const member = this.memberRepository.create({
      organizationId,
      userId,
      role,
      invitedBy,
    });

    return this.memberRepository.save(member);
  }

  async removeMember(organizationId: string, userId: string, removedBy: string): Promise<void> {
    const member = await this.memberRepository.findOne({
      where: { organizationId, userId, status: 'active' },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Can't remove owner
    if (member.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    member.status = 'removed';
    await this.memberRepository.save(member);
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: MemberRole,
    updatedBy: string,
  ): Promise<OrganizationMember> {
    const member = await this.memberRepository.findOne({
      where: { organizationId, userId, status: 'active' },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Can't change owner role
    if (member.role === MemberRole.OWNER) {
      throw new ForbiddenException('Cannot change owner role');
    }

    member.role = role;
    return this.memberRepository.save(member);
  }

  async getMemberRole(organizationId: string, userId: string): Promise<MemberRole | null> {
    const member = await this.memberRepository.findOne({
      where: { organizationId, userId, status: 'active' },
    });

    return member ? member.role : null;
  }

  async canAccessOrganization(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { organizationId, userId, status: 'active' },
    });

    return !!member;
  }
}