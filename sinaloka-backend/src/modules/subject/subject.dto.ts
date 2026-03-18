import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export const UpdateSubjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export class CreateSubjectDto extends createZodDto(CreateSubjectSchema) {}
export class UpdateSubjectDto extends createZodDto(UpdateSubjectSchema) {}
