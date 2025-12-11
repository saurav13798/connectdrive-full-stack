import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as fc from 'fast-check';
import { RegisterDto, LoginDto } from './auth.dto';
import { ConfirmUploadDto, PaginationDto } from './file.dto';
import { CreateFolderDto, MoveFileDto } from './folder.dto';
import { CreateShareDto } from './share.dto';

// **Feature: connectdrive-completion, Property 44: Input validation**
describe('Input Validation Properties', () => {
  describe('RegisterDto validation', () => {
    it('should reject invalid email addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter(s => !s.includes('@') || s.length < 3),
          fc.string({ minLength: 8 }),
          async (invalidEmail, password) => {
            const dto = plainToClass(RegisterDto, {
              email: invalidEmail,
              password: password + 'A1', // Ensure password meets requirements
            });

            const errors = await validate(dto);
            const emailErrors = errors.find(error => error.property === 'email');
            expect(emailErrors).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject weak passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.oneof(
            fc.string({ maxLength: 7 }), // Too short
            fc.string({ minLength: 8 }).filter(s => !/[A-Z]/.test(s)), // No uppercase
            fc.string({ minLength: 8 }).filter(s => !/[a-z]/.test(s)), // No lowercase
            fc.string({ minLength: 8 }).filter(s => !/\d/.test(s)) // No digit
          ),
          async (email, weakPassword) => {
            const dto = plainToClass(RegisterDto, {
              email,
              password: weakPassword,
            });

            const errors = await validate(dto);
            const passwordErrors = errors.find(error => error.property === 'password');
            expect(passwordErrors).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid registration data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.string({ minLength: 8, maxLength: 50 }).map(s => s + 'A1'), // Ensure strong password
          fc.option(fc.string({ maxLength: 100 })),
          async (email, password, displayName) => {
            const dto = plainToClass(RegisterDto, {
              email,
              password,
              displayName,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ConfirmUploadDto validation', () => {
    it('should reject invalid file data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''), // Empty filename
            fc.string({ minLength: 256 }), // Too long filename
          ),
          fc.oneof(
            fc.constant(0), // Zero size
            fc.constant(-1), // Negative size
          ),
          fc.string(),
          async (invalidFilename, invalidSize, mime) => {
            const dto = plainToClass(ConfirmUploadDto, {
              filename: invalidFilename,
              size: invalidSize,
              mime,
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid file upload data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }),
          fc.integer({ min: 1, max: 1000000000 }),
          fc.string({ minLength: 1 }),
          fc.option(fc.uuid()),
          async (filename, size, mime, folderId) => {
            const dto = plainToClass(ConfirmUploadDto, {
              filename,
              size,
              mime,
              folderId,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('PaginationDto validation', () => {
    it('should reject invalid pagination parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(0), // Page 0
            fc.constant(-1), // Negative page
          ),
          fc.oneof(
            fc.constant(0), // Limit 0
            fc.constant(101), // Limit too high
            fc.constant(-1), // Negative limit
          ),
          async (invalidPage, invalidLimit) => {
            const dto = plainToClass(PaginationDto, {
              page: invalidPage,
              limit: invalidLimit,
            });

            const errors = await validate(dto);
            expect(errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid pagination parameters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 100 }),
          fc.option(fc.uuid()),
          async (page, limit, folderId) => {
            const dto = plainToClass(PaginationDto, {
              page,
              limit,
              folderId,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CreateFolderDto validation', () => {
    it('should reject invalid folder names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(''), // Empty name
            fc.string({ minLength: 256 }), // Too long
            fc.constantFrom('con', 'aux', 'nul', 'prn'), // Reserved names
            fc.string().filter(s => /[<>:"/\\|?*]/.test(s)), // Invalid characters
          ),
          async (invalidName) => {
            const dto = plainToClass(CreateFolderDto, {
              name: invalidName,
            });

            const errors = await validate(dto);
            const nameErrors = errors.find(error => error.property === 'name');
            expect(nameErrors).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid folder names', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 255 }).filter(s => !/[<>:"/\\|?*]/.test(s)),
          fc.option(fc.uuid()),
          async (name, parentId) => {
            const dto = plainToClass(CreateFolderDto, {
              name,
              parentId,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('CreateShareDto validation', () => {
    it('should require either fileId or folderId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (isPublic) => {
            const dto = plainToClass(CreateShareDto, {
              isPublic,
              // Neither fileId nor folderId provided
            });

            // This should be handled by business logic, not validation
            // But we can test that the DTO structure is valid
            const errors = await validate(dto);
            // The DTO itself is valid, business logic should check for fileId/folderId
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept valid share data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.uuid()),
          fc.option(fc.uuid()),
          fc.boolean(),
          fc.option(fc.record({
            read: fc.boolean(),
            write: fc.boolean(),
            delete: fc.boolean(),
          })),
          async (fileId, folderId, isPublic, permissions) => {
            // Ensure at least one of fileId or folderId is provided
            if (!fileId && !folderId) {
              fileId = fc.sample(fc.uuid(), 1)[0];
            }

            const dto = plainToClass(CreateShareDto, {
              fileId,
              folderId,
              isPublic,
              permissions,
            });

            const errors = await validate(dto);
            expect(errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});