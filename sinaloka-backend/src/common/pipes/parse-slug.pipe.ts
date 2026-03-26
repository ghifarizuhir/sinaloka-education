import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { SLUG_REGEX } from '../../modules/institution/institution.dto.js';

@Injectable()
export class ParseSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!value || value.length > 63 || !SLUG_REGEX.test(value)) {
      throw new BadRequestException('Invalid slug format');
    }
    return value;
  }
}
