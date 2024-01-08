export class ItemDto {
  lengthInCm: number;
  widthInCm: number;
  heightInCm: number;
  name: string;
  user_id: number;
  friend_id: number;
  weightInGrams: number;
  id: number;

  constructor(itemData: {
    lengthInCm: number;
    widthInCm: number;
    heightInCm: number;
    name: string;
    user_id: number;
    friend_id: number;
    weightInGrams: number;
    id: number;
  }) {
    if (
      !itemData.name ||
      !itemData.weightInGrams ||
      !itemData.id ||
      !itemData.friend_id ||
      !itemData.user_id ||
      !itemData.heightInCm ||
      !itemData.widthInCm ||
      !itemData.lengthInCm
    ) {
      throw new Error('Missing required item information');
    }

    this.name = itemData.name;
    this.lengthInCm = itemData.lengthInCm;
    this.widthInCm = itemData.widthInCm;
    this.heightInCm = itemData.heightInCm;
    this.user_id = itemData.user_id;
    this.friend_id = itemData.friend_id;
    this.weightInGrams = itemData.weightInGrams;
    this.id = itemData.id;
  }
}
