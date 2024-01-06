import { FrontDto } from '../frontDtos/front.dto';

export class CenterWithFrontDto {
  name: string;
  id: string;
  created_at: Date;
  front: FrontDto;
}
