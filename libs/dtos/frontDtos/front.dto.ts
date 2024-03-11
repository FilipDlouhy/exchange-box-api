import { Front } from '@app/database';

export class FrontDto {
  id: number;
  numberOfTasksInFront: number;
  totalNumberOfTasks: number;
  numberOfLargeBoxes: number;
  numberOfMediumBoxes: number;
  numberOfSmallBoxes: number;
  numberOfLargeBoxesTotal: number;
  numberOfMediumBoxesTotal: number;
  numberOfSmallBoxesTotal: number;

  constructor(front: Front) {
    this.id = front.id;
    this.numberOfTasksInFront = front.numberOfTasksInFront;
    this.totalNumberOfTasks = front.totalNumberOfTasks;
    this.numberOfLargeBoxes = front.numberOfLargeBoxes;
    this.numberOfMediumBoxes = front.numberOfMediumBoxes;
    this.numberOfSmallBoxes = front.numberOfSmallBoxes;
    this.numberOfLargeBoxesTotal = front.numberOfLargeBoxesTotal;
    this.numberOfMediumBoxesTotal = front.numberOfMediumBoxesTotal;
    this.numberOfSmallBoxesTotal = front.numberOfSmallBoxesTotal;
  }
}
