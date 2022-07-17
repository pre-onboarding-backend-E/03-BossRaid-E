import { Body, Controller, Get, InternalServerErrorException, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidStatusRes } from './dto/raidStatusRes.dto';
import { RaidService } from './raid.service';
import { RaidEnterDto } from './dto/raidEnter.dto';
import { ApiBearerAuth, ApiCreatedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/passport/guard/jwtAuthGuard';
import { MSG } from 'src/utils/responseHandler/response.enum';
import { TopRankerListDto } from './dto/topRankerList.dto';
import { IRaidStatus } from './interface/raidStatus.interface';
import { ErrorType } from 'src/utils/responseHandler/error.enum';

@ApiBearerAuth('access_token')
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ status: ErrorType.unAuthorized.code, description: ErrorType.unAuthorized.msg })
@ApiTags('BossRaid')
@Controller('bossRaid')
export class RaidController {
  constructor(private readonly raidService: RaidService) {}

  /**
   * @작성자 김태영
   * @description 레이드 상태 조회 컨트롤러
   * - try : 레디스 조회시 결과
   *  - 리턴값에 맞게 레이드 레코드 아이디는 제외합니다
   * - catch : 레디스 에러 시 DB에서의 상태 조회 결과
   *  - 리턴값에 맞게 레이드 레코드 아이디는 제외합니다
   */
  @ApiOperation({ description: '레이드 상태 조회 api입니다', summary: '레이드 상태 조회' })
  @ApiResponse({ type: RaidStatusRes, status: MSG.getRaidStatus.code, description: MSG.getRaidStatus.msg })
  @ApiInternalServerErrorResponse({ status: ErrorType.redisError.code, description: ErrorType.redisError.msg })
  @ApiNotFoundResponse({ status: ErrorType.raidStatusNotFound.code, description: ErrorType.raidStatusNotFound.msg })
  @Get()
  async getRaidStatus(): Promise<RaidStatusRes> {
    try {
      const redisResult: IRaidStatus = await this.raidService.getStatusFromRedis();
      delete redisResult.raidRecordId;

      return redisResult;
    } catch (error) {
      console.log(error);
      const dbResult: IRaidStatus = await this.raidService.getStatusFromDB();
      delete dbResult.raidRecordId;

      return dbResult;
    }
  }

  /**
   * @작성자 박신영
   * @description 레이드 시작 컨트롤러
   */
  @ApiBody({ type: RaidEnterDto })
  @ApiCreatedResponse({
    description: MSG.enterBossRaid.msg,
  })
  @Post('enter')
  async enterRaid(@Body() raidEnterDto: RaidEnterDto) {
    const result = await this.raidService.enterBossRaid(raidEnterDto);
    // 캐시에 항목 추가

    return result;
  }

  /**
   * @작성자 김용민
   * @description 레이드 종료 컨트롤러
   */
  @ApiOperation({ 
    description: '진행 중인 레이드를 종료합니다. 해당 기록과 사용자 랭킹을 업데이트합니다.', 
    summary: '레이드 종료', 
  })
  @ApiBody({ type: RaidEndDto })
  @ApiResponse({ type: RaidStatusRes, status: MSG.endBossRaid.code, description: MSG.endBossRaid.msg })
  @Patch('end')
  endRaid(@Body() raidEndDto: RaidEndDto): Promise<void> {
    return this.raidService.endRaid(raidEndDto);
  }

  /**
   * @작성자 염하늘
   * @description 레이드 유저 랭킹 조회 컨트롤러
   */
  @ApiOperation({ description: '레이드 유저 랭킹 조회 api입니다', summary: '레이드 랭킹 조회' })
  @ApiBody({ type: TopRankerListDto })
  @Post('topRankerList')
  topRankerList(@Body() raidRankDto: TopRankerListDto) {
    return this.raidService.rankRaid(raidRankDto);
  }
}
