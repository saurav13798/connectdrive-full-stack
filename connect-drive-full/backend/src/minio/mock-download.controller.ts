import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { MockStorageService } from './mock-storage.service';

@Controller('mock-download')
export class MockDownloadController {
  constructor(private mockStorageService: MockStorageService) {}

  @Get(':key')
  async handleMockDownload(
    @Param('key') key: string,
    @Res() res: Response,
  ) {
    try {
      const fileBuffer = this.mockStorageService.getFile(key);
      
      if (!fileBuffer) {
        throw new NotFoundException(`File with key ${key} not found`);
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename="${key}"`);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error('Mock download error:', error);
      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).json({ error: error.message });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Download failed' });
      }
    }
  }
}