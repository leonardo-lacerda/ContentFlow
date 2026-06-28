export class BrandProfileResponseDto {
  id!: string;
  organizationId!: string;
  name!: string;
  website?: string;
  industry?: string;
  status!: string;
  selected!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  deletedAt?: Date;
}
