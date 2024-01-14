import { IsInt, IsString, IsNotEmpty } from 'class-validator';

export class ChangeExchangeStatusDto {
  @IsNotEmpty()
  @IsString()
  public exchange_state: string;

  @IsNotEmpty()
  @IsInt()
  public id: number;

  constructor(exchange_state: string, id: number) {
    this.exchange_state = exchange_state;
    this.id = id;
  }
}
