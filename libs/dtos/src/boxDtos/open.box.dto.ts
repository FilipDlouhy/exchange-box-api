import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class OpenBoxDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  exchangeId: number;

  @IsNotEmpty()
  openBoxCode: string;

  constructor(exchangeId: number, openBoxCode: string) {
    this.exchangeId = exchangeId;
    this.openBoxCode = openBoxCode;
  }
}
