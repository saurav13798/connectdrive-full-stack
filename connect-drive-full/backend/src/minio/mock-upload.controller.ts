import {
  Controller,
  Put,
  Param,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MockStorageService } from './mock-storage.service';

@Controller('mock-upload')
export class MockUploadController {
  constructor(private mockStorageService: MockStorageService) {}

  @Put(':key')
  async handleMockUpload(
    @Param('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Collect the raw body data
      const chunks: Buffer[] = [];
      
      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        this.mockStorageService.storeFile(key, fileBuffer);
        console.log(`Mock upload completed for key: ${key}, size: ${fileBuffer.length} bytes`);
        res.status(HttpStatus.OK).json({ message: 'Upload successful', key });
      });

      req.on('error', (error) => {
        console.error('Mock upload error:', error);
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Upload failed' });
      });
    } catch (error) {
      console.error('Mock upload error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Upload failed' });
    }
  }
}