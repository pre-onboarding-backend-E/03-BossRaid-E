import { ApiProperty } from '@nestjs/swagger';

/**
 * @작성자 김태영
 * @description 레이드 상태 조회시 반환값
 */
export class RaidStatusRes {
  @ApiProperty({ description: '레이드 입장가능 여부', example: false })
  canEnter: boolean;

  @ApiProperty({ description: '레이드를 이미 진행중인 유저의 id', example: 1 })
  enteredUserId: number;
}
