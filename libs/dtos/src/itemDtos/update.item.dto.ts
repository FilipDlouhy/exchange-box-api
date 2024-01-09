export class UpdateItemDto {
  lengthInCm: number;
  widthInCm: number;
  heightInCm: number;
  name: string;
  friend_id: number;
  weightInGrams: number;
  id: number;

  constructor() {
    this.lengthInCm = 0;
    this.widthInCm = 0;
    this.heightInCm = 0;
    this.name = '';
    this.friend_id = 0;
    this.weightInGrams = 0;
    this.id = 0;
  }
}
