import { BillingType } from '@prisma/client';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePackageDto {
  @IsString()
  name!: string;

  @IsEnum(BillingType)
  billingType!: BillingType;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsInt()
  @Min(1)
  propertiesQuota!: number;

  @IsInt()
  @Min(0)
  productionsQuota!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAdvisors?: number;
}
