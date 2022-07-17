import {
  BadRequestException,
  CACHE_MANAGER,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Connection, Repository } from 'typeorm';
import { RaidEndDto } from './dto/raidEnd.dto';
import { RaidRecord } from './entities/raid.entity';
import { RaidEnterDto } from './dto/raidEnter.dto';
import { EnterBossRaidOption } from 'src/raid/interface/enterBossOption.interface';
import { Cache } from 'cache-manager';
import { TopRankerListDto } from './dto/topRankerList.dto';
import { IRankingInfo } from './interface/rankingInfo.interface';
import { ErrorType } from 'src/utils/responseHandler/error.enum';
import { InjectQueue, Processor } from '@nestjs/bull';
import { Queue } from 'bull';
import AxiosHelper from '../utils/helper/axiosHelper';
import moment from 'moment';
import { UserService } from 'src/user/user.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { IRaidStatus } from './interface/raidStatus.interface';

@Injectable()
@Processor('playerQueue')
export class RaidService {
  constructor(
    @InjectRepository(RaidRecord)
    private readonly raidRecordRepository: Repository<RaidRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private userService: UserService,
    @InjectQueue('playerQueue')
    private playerQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    private readonly connection: Connection,
  ) {
    this.staticDataCaching();
  }

  /**
   * @작성자 박신영
   * @description 레이드 시작에 관한 비지니스 로직 구현
   */
  async enterBossRaid(raidEnterDto: RaidEnterDto): Promise<EnterBossRaidOption> {
    // queue에 보스 레이드를 시작하려는 유저를 넣습니다.
    let queueData;
    try {
      await this.addPlayerQueue(raidEnterDto);
      queueData = await this.playerQueue.getJobs(['delayed'], 0, 0, false);
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.bullError.msg);
    }

    // - 레이드 상태 조회
    let redisResult: IRaidStatus;
    let dbResult: IRaidStatus;
    try {
      redisResult = await this.getStatusFromRedis();
    } catch (error) {
      dbResult = await this.getStatusFromDB();
    }
    // 레이드 시작 불가능
    if (!redisResult?.canEnter) {
      throw new ForbiddenException(ErrorType.raidStatusForbidden.msg);
    }

    // 레이드 생성
    const { userId, level } = queueData[0].data;
    try {
      const raidData = await this.startBossRaid({ userId, level });
      return raidData;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  async startBossRaid(raidEnterDto: RaidEnterDto): Promise<EnterBossRaidOption> {
    try {
      const user = await this.userRepository.findOne({ where: { id: raidEnterDto.userId } });
      const newBossRaid = this.raidRecordRepository.create({
        user,
        level: raidEnterDto.level,
        score: 0,
      });

      const raidRecord = await this.raidRecordRepository.save(newBossRaid);
      const setRedis: IRaidStatus = {
        canEnter: false,
        enteredUserId: raidEnterDto.userId,
        raidRecordId: raidRecord.id,
      };
      await this.cacheManager.set('raidStatus', setRedis, { ttl: 180 });

      const enterOption: EnterBossRaidOption = {
        isEntered: true,
        raidRecordId: newBossRaid.id,
      };

      return enterOption;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /**
   * @작성자 박신영
   * @description
   * - 2. Producer
   * - queue에 userId와 level을 추가합니다. (큐에 추가한 데이터를 Job이라고 합니다)
   * - Job은 Consumer(raid.consumer)이 데이터를 처리하는데 필요한 데이터를 포함한 개체입니다.
   * - option은 지연(생성 시점 부터 작업을 실행할 시기), 시도(작업 실패 시 재시도 횟수)와 같은 옵션 등이 있습니다.
   */
  async addPlayerQueue(playerData: RaidEnterDto) {
    try {
      const player = await this.playerQueue.add('player', playerData, {
        removeOnComplete: true,
        removeOnFail: true,
        delay: 1,
      });
      return player;
    } catch (e) {
      throw new InternalServerErrorException(ErrorType.serverError.msg);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 종료에 관한 비지니스 로직 구현
   * - 레디스의 레이드 상태값과 DB에 있는 레이드 기록을 가져옵니다.
   * - 레이드 상태와 레이드 기록이 유효하다면 레이드 기록과 유저에 스코어를 반영합니다.
   * - 해당 레이드 기록과 유저 정보를 DB에 저장합니다.
   * - 진행 중인 레이드 상태를 레디스에서 삭제하여 종료합니다.
   * - 레디스에 유저 랭킹 정보를 등록합니다.
   */
  async endRaid(raidEndDto: RaidEndDto): Promise<void> {
    const { userId, raidRecordId } = raidEndDto;
    const raidStatus: IRaidStatus = await this.cacheManager.get('raidStatus');

    this.checkRaidStatus(raidStatus, userId, raidRecordId);

    const record: RaidRecord = await this.getRaidRecordById(raidRecordId);
    const score = await this.cacheManager.get(`level_${record.level}`);
    if (!score) {
      throw new BadRequestException(ErrorType.raidLevelNotFound.msg);
    }
    record.score = Number(score);

    const user: User = await this.userService.getUserById(userId);
    user.totalScore = user.totalScore + record.score;

    await this.saveRaidRecord(user, record);
    await this.cacheManager.del('raidStatus');
    await this.updateUserRanking(userId, record.score);
  }

  /**
   * @작성자 김태영
   * @description 레디스에서 레이드 상태 정보 불러오기
   * - 상태 정보가 존재하면 입장가능여부 false로 전달, 존재하지 않으면 입장가능여부 true로 전달
   * - 에러시 레디스 에러로 간주합니다
   */
  async getStatusFromRedis(): Promise<IRaidStatus> {
    try {
      const getRedis: IRaidStatus = await this.cacheManager.get('raidStatus');

      const result: IRaidStatus = getRedis ? getRedis : { canEnter: true, enteredUserId: null, raidRecordId: null };

      return result;
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /**
   * @작성자 김태영
   * @description 데이터베이스에서 최근 레이드 기록을 통해 레이드 상태 정보 불러오기
   * - 가장 최근의 레이드 기록을 불러 옵니다
   *  - 에러시 sql 에러
   * - 레이드 레코드 값이 없을 시 에러
   * - 현재시간과 레이드 시작 시간간의 차이가 레이드 제한시간 보다 작을시 레이드가 진행중인 것으로 간주합니다
   *  - 상태 정보가 존재하면 그대로 전달, 존재하지 않으면 입장여부 true로 전달
   */
  async getStatusFromDB(): Promise<IRaidStatus> {
    let raidRecord: RaidRecord;
    try {
      raidRecord = await this.raidRecordRepository
        .createQueryBuilder('record')
        .leftJoinAndSelect('record.user', 'user')
        .orderBy('enterTime', 'DESC')
        .getOne(); //
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.databaseServerError.msg);
    }

    if (!raidRecord) throw new NotFoundException(ErrorType.raidRecordNotFound.msg);

    const now = moment(); // 현재시간
    const enterTime = moment(raidRecord.enterTime); // 레이드 기록 상의 레이드 시작 시간

    const duration = moment.duration(now.diff(enterTime)).asSeconds(); // moment.js로 현재시간과 레이드 시작시간 간의 차이(초) 계산
    const bossRaidLimitSeconds = await this.cacheManager.get('bossRaidLimitSeconds'); // 레이드 제한 시간

    const result: IRaidStatus =
      duration < Number(bossRaidLimitSeconds) //
        ? { canEnter: false, enteredUserId: raidRecord.user.id, raidRecordId: raidRecord.id }
        : { canEnter: true, enteredUserId: null, raidRecordId: null };
    return result;
  }

  /**
   * @작성자 염하늘
   * @description 레이드 랭킹 조회 로직 구현
   */
  async rankRaid(raidRankDto: TopRankerListDto) {
    // user 존재 여부를 조회합니다.
    const user = await this.userService.getUserById(raidRankDto.userId);

    // top 10 랭킹을 조회합니다.
    const RankerInfoList = await this.getTopRankerList();
    const topRankerInfoList = RankerInfoList.slice(0, 9);

    // 접속한 유저(자신)의 랭킹을 조회합니다.
    let ranking = 0;
    RankerInfoList.forEach(element => {
      if (user.id == element.userId) ranking = element.ranking;
    });
    const myRankingInfo: IRankingInfo = {
      ranking: ranking,
      userId: user.id,
      totalScore: user.totalScore,
    };
    return { topRankerInfoList, myRankingInfo };
  }

  /**
   * @작성자 염하늘
   * @description static data를 redis에 캐싱합니다.
   */
  public async staticDataCaching() {
    // S3 static data 가져오기
    const staticData = await AxiosHelper.getInstance();
    const bossRaid = staticData.data.bossRaids[0];

    await this.cacheManager.set('bossRaidLimitSeconds', bossRaid.bossRaidLimitSeconds, { ttl: 0 });
    await this.cacheManager.set('level_0', bossRaid.levels[0].score, { ttl: 0 });
    await this.cacheManager.set('level_1', bossRaid.levels[1].score, { ttl: 0 });
    await this.cacheManager.set('level_2', bossRaid.levels[2].score, { ttl: 0 });
  }

  /**
   * @작성자 김태영, 염하늘
   * @description 랭크 탑 10 리스트 불러오기
   *  레이드를 진행한 전체 유저의 점수(totalScore)를 내림차 순으로 가져옵니다.(zscore)
   *  해당 점수의 랭킹 리스트를 가져옵니다. (zrevrangebyscore)
   *  위의 랭킹 리스트[0]에 해당하는 랭킹을 가져와서 동점을 처리합니다.  (zrevrank)
   */
  async getTopRankerList(): Promise<IRankingInfo[]> {
    const allUsers = await this.redis.zrevrange('Raid-Rank', 0, -1);
    const resultTotal: IRankingInfo[] = await Promise.all(
      allUsers.map(async el => {
        const score = await this.redis.zscore('Raid-Rank', el);
        const sameScoreList = await this.redis.zrevrangebyscore('Raid-Rank', score, score);
        const firstKey = sameScoreList[0];
        const rank = await this.redis.zrevrank('Raid-Rank', firstKey);
        const result: IRankingInfo = { ranking: rank + 1, userId: Number(el), totalScore: Number(score) };
        return result;
      }),
    );

    return resultTotal;
  }

  /**
   * @작성자 김용민, 김태영
   * @description 레이드 종료 시 레이드 기록과 유저 정보를 트랜잭션으로 DB에 저장
   */
  async saveRaidRecord(user: User, record: RaidRecord): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');
    try {
      await queryRunner.manager.save(user);
      await queryRunner.manager.save(record);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * @작성자 김태영, 염하늘
   * @description 레이드 종료 시 유저 랭킹을 레디스에 업데이트
   */
  async updateUserRanking(userId: number, score: number): Promise<void> {
    try {
      await this.redis.zincrby('Raid-Rank', score, userId);
    } catch (error) {
      throw new InternalServerErrorException(ErrorType.redisError.msg);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 상태가 유효한 값인지 확인
   * - 레이드 상태가 없는 경우
   * - 레이드 상태와 request body가 일치하지 않는 경우
   */
  checkRaidStatus(raidStatus: IRaidStatus, userId: number, raidRecordId: number) {
    if (!raidStatus) {
      throw new NotFoundException(ErrorType.raidStatusNotFound.msg);
    }

    if (raidStatus.enteredUserId !== userId || raidStatus.raidRecordId !== raidRecordId) {
      throw new BadRequestException(ErrorType.raidStatusBadRequest.msg);
    }
  }

  /**
   * @작성자 김용민
   * @description 레이드 기록 가져오기
   */
  async getRaidRecordById(raidStatusId: number) {
    const record = await this.raidRecordRepository.findOne({ where: { id: raidStatusId } });

    if (!record) {
      throw new NotFoundException(ErrorType.raidRecordNotFound.msg);
    }

    return record;
  }
}
