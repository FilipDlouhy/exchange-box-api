import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ChangeExchangeStatusDto {
  @IsNotEmpty()
  @IsString()
  public exchangeState: string;

  @IsNotEmpty()
  @IsInt()
  public id: number;
}
