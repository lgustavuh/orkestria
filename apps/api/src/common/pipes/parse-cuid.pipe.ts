import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseCuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    // CUID format: starts with 'c', lowercase alphanumeric, 25 chars
    // CUID2 format: variable length, lowercase alphanumeric
    if (!value || typeof value !== 'string') {
      throw new BadRequestException('ID inválido');
    }

    // Basic validation: alphanumeric and reasonable length
    const cuidRegex = /^[a-z0-9]{20,32}$/;
    if (!cuidRegex.test(value)) {
      throw new BadRequestException(`ID inválido: ${value}`);
    }

    return value;
  }
}
