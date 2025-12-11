import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { WorkerService } from './worker.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('worker')
@UseGuards(JwtAuthGuard)
export class WorkerController {
  constructor(private workerService: WorkerService) {}

  @Post('jobs/file-processing')
  async queueFileProcessing(
    @Body() body: { fileId: string; action: string; metadata?: any },
  ): Promise<{ jobId: string; message: string }> {
    await this.workerService.queueFileProcessing(body.fileId, body.action, body.metadata);
    return { jobId: '', message: 'File processing job queued' };
  }

  @Post('jobs/cleanup')
  async queueCleanup(
    @Body() body: { type: 'recycle-bin' | 'temp-files' | 'old-versions' },
  ): Promise<{ message: string }> {
    await this.workerService.queueCleanup(body.type);
    return { message: 'Cleanup job queued' };
  }

  @Post('jobs/notification')
  async queueNotification(
    @Body() body: { userId: string; type: string; message: string },
    @Request() req: any,
  ): Promise<{ message: string }> {
    // Only admin or user themselves can queue notifications
    if (req.user.id !== body.userId) {
      throw new Error('Unauthorized');
    }
    await this.workerService.queueNotification(body.userId, body.type, body.message);
    return { message: 'Notification job queued' };
  }

  @Get('jobs/:queueName/:jobId')
  async getJobStatus(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
  ): Promise<any> {
    return this.workerService.getJobStatus(jobId, queueName);
  }

  @Get('jobs/:queueName')
  async listJobs(
    @Param('queueName') queueName: string,
    @Query('state') state: 'active' | 'completed' | 'failed' = 'active',
  ): Promise<any[]> {
    return this.workerService.listJobs(queueName, state);
  }
}
