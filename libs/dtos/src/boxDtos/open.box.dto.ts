import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class OpenBoxDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  openBoxCode: string;
}
