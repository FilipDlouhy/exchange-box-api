import { IsInt, IsDate } from 'class-validator';

export class FrontDto {
  @IsInt()
  id: number;

  @IsInt()
  centerId: number;

  @IsDate()
  createdAt: Date;

  @IsInt()
  totalNumberOfTasks: number;

  @IsInt()
  numberOfTasksInFront: number;

  @IsInt()
  numberOfMediumBoxes: number;

  @IsInt()
  numberOfLargeBoxes: number;

  @IsInt()
  numberOfSmallBoxes: number;

  @IsInt()
  numberOfMediumBoxesTotal: number;

  @IsInt()
  numberOfLargeBoxesTotal: number;

  @IsInt()
  numberOfSmallBoxesTotal: number;
}
