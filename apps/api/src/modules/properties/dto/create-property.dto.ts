import { OperationType, PropertyType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsString, Min } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(OperationType)
  operationType!: OperationType;

  @IsEnum(PropertyType)
  propertyType!: PropertyType;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsNumber()
  @Min(0)
  areaM2!: number;

  @IsInt()
  @Min(0)
  rooms!: number;

  @IsInt()
  @Min(0)
  bathrooms!: number;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;
}
