import { BadRequestException } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

export async function validateDto(dtoToValidate, typeToValidateBy) {
  const dto = plainToClass(typeToValidateBy, dtoToValidate);
  const errors = await validate(dto);

  if (errors.length > 0) {
    const detailedErrors = errors.map((error) => ({
      property: error.property,
      constraints: error.constraints,
    }));
    throw new BadRequestException({
      message: 'Validation failed. Bad data had been sent.',
      errors: detailedErrors,
    });
  }
}
