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
    length: number;
    width: number;
    height: number;
    name: string;
    user_id: number;
    friend_id: number;
    weight: number;
    id: number;
  }) {
    if (
      !itemData.name ||
      !itemData.weight ||
      !itemData.id ||
      !itemData.friend_id ||
      !itemData.user_id ||
      !itemData.height ||
      !itemData.width ||
      !itemData.length
    ) {
      throw new Error('Missing required item information');
    }

    this.name = itemData.name;
    this.lengthInCm = itemData.length;
    this.widthInCm = itemData.width;
    this.heightInCm = itemData.height;
    this.user_id = itemData.user_id;
    this.friend_id = itemData.friend_id;
    this.weightInGrams = itemData.weight;
    this.id = itemData.id;
  }
}
