import { IsInt } from 'class-validator';

export class FrontExchangeDto {
  @IsInt()
  id: number;

  @IsInt()
  numberOfTasksInFront: number;

  @IsInt()
  numberOfMediumBoxes: number;

  @IsInt()
  numberOfLargeBoxes: number;

  @IsInt()
  numberOfSmallBoxes: number;

  constructor(
    id: number,
    numberOfMediumBoxes: number,
    numberOfLargeBoxes: number,
    numberOfSmallBoxes: number,
  ) {
    this.id = id;
    this.numberOfMediumBoxes = numberOfMediumBoxes;
    this.numberOfLargeBoxes = numberOfLargeBoxes;
    this.numberOfSmallBoxes = numberOfSmallBoxes;
  }
}
