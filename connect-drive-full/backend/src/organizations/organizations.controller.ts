import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MemberRole } from './entities/organization-member.entity';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  async create(
    @Body() body: { name: string; description?: string },
    @Request() req: any,
  ) {
    return this.organizationsService.create(req.user.id, body.name, body.description);
  }

  @Get()
  async findByUser(@Request() req: any) {
    return this.organizationsService.findByUser(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const canAccess = await this.organizationsService.canAccessOrganization(id, req.user.id);
    if (!canAccess) {
      throw new Error('Access denied');
    }
    return this.organizationsService.findOne(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') organizationId: string,
    @Body() body: { userId: string; role?: MemberRole },
    @Request() req: any,
  ) {
    const userRole = await this.organizationsService.getMemberRole(organizationId, req.user.id);
    if (!userRole || (userRole !== MemberRole.OWNER && userRole !== MemberRole.ADMIN)) {
      throw new Error('Insufficient permissions');
    }

    return this.organizationsService.addMember(
      organizationId,
      body.userId,
      body.role || MemberRole.MEMBER,
      req.user.id,
    );
  }

  @Put(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Body() body: { role: MemberRole },
    @Request() req: any,
  ) {
    const userRole = await this.organizationsService.getMemberRole(organizationId, req.user.id);
    if (!userRole || (userRole !== MemberRole.OWNER && userRole !== MemberRole.ADMIN)) {
      throw new Error('Insufficient permissions');
    }

    return this.organizationsService.updateMemberRole(
      organizationId,
      userId,
      body.role,
      req.user.id,
    );
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') organizationId: string,
    @Param('userId') userId: string,
    @Request() req: any,
  ) {
    const userRole = await this.organizationsService.getMemberRole(organizationId, req.user.id);
    if (!userRole || (userRole !== MemberRole.OWNER && userRole !== MemberRole.ADMIN)) {
      throw new Error('Insufficient permissions');
    }

    await this.organizationsService.removeMember(organizationId, userId, req.user.id);
    return { message: 'Member removed successfully' };
  }
}