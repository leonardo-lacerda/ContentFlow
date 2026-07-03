import { IsObject, IsNotEmpty } from 'class-validator';

export class ReRenderEmailDto {
  @IsObject()
  @IsNotEmpty()
  bodyJson!: { blocks: Array<Record<string, any>> };
}
