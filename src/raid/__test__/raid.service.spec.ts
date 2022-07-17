/* 
    작성자 : 김태영
      - raid.service 유닛 테스트 파일 작성
  */

import { CacheModule, CACHE_MANAGER, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { Cache } from 'cache-manager';
import { RedisModule } from 'nestjs-redis';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { ErrorType } from 'src/utils/responseHandler/error.enum';
import { Connection, DataSource, QueryBuilder, QueryRunner, Repository } from 'typeorm';
import { RaidEndDto } from '../dto/raidEnd.dto';
import { RaidRecord } from '../entities/raid.entity';
import { IRaidStatus } from '../interface/raidStatus.interface';
import { RaidService } from '../raid.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockReturnThis(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    delete: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
  }),
});

const mockUserService = () => ({
  getUserById: jest.fn(),
});

describe('RaidService', () => {
  let raidService: RaidService;
  let raidRecordRepository: MockRepository<RaidRecord>;
  let userRepository: MockRepository<User>;
  let dataSource: DataSource;
  let cache: Cache;
  let userService: UserService;

  const qb = {
    connection: {},
  } as QueryBuilder<RaidRecord>;

  const qr = {
    manager: {},
  } as QueryRunner;

  class MockDataSource {
    createQueryRunner(): QueryRunner {
      return qr;
    }

    createQueryBuilder(): QueryBuilder<RaidRecord> {
      return qb;
    }
  }

  qr.connect = jest.fn();
  qr.startTransaction = jest.fn();
  qr.commitTransaction = jest.fn();
  qr.rollbackTransaction = jest.fn();
  qr.release = jest.fn();

  beforeAll(async () => {
    Object.assign(qr.manager, { save: jest.fn() });

    const module = await Test.createTestingModule({
      providers: [
        RedisModule,
        CacheModule,
        RaidService,
        {
          provide: 'RaidRecordRepository',
          useFactory: mockRepository,
        },
        {
          provide: 'UserRepository',
          useFactory: mockRepository,
        },
        {
          provide: UserService,
          useFactory: mockUserService,
        },
        { provide: DataSource, useClass: MockDataSource },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: () => 'any value',
            set: () => jest.fn(),
            del: () => jest.fn(),
          },
        },
        { provide: 'BullQueue_playerQueue', useValue: [] },
        { provide: 'default_IORedisModuleConnectionToken', useExisting: RedisModule },
        { provide: Connection, useClass: MockDataSource },
      ],
    }).compile();

    raidService = module.get<RaidService>(RaidService);
    userService = module.get<UserService>(UserService);
    raidRecordRepository = module.get('RaidRecordRepository') as MockRepository<RaidRecord>;
    userRepository = module.get('UserRepository') as MockRepository<User>;
    dataSource = module.get<DataSource>(DataSource);
    cache = module.get(CACHE_MANAGER);
  });

  it('isDefined 테스트', () => {
    expect(raidService).toBeDefined();
  });

  /**
   * @작성자 김용민
   * @description 레이드 종료에 관한 비지니스 로직을 테스트
   */
  describe('endRaid method', () => {
    const raidStatus: IRaidStatus = { canEnter: false, enteredUserId: 1, raidRecordId: 1 };
    const raidEndDto: RaidEndDto = { userId: 1, raidRecordId: 1 };
    
    const user: User = new User();
    user.id = 1;
    user.email = 'test@mail.com';
    user.password = 'password1234';
    user.createdAt = new Date();
    user.nickname = 'tester';
    user.totalScore = 0;
    
    const record: RaidRecord = new RaidRecord();
    record.id = 1;
    record.enterTime = new Date();
    record.user = user;
    record.level = 0;
    record.score = 0;
    
    test('레이드 종료에 성공합니다.', async () => {
      const { userId, raidRecordId } = raidEndDto;
      const cacheGetSpy = jest.spyOn(cache, 'get');

      // jest.spyOn(raidService, 'getRaidRecordById').mockResolvedValueOnce(record);
      // jest.spyOn(cache, 'get').mockResolvedValueOnce(20);
      // jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(user);
      // jest.spyOn(raidService, 'saveRaidRecord').mockResolvedValueOnce(null);
      // jest.spyOn(cache, 'del').mockRejectedValueOnce(null);
      // jest.spyOn(raidService, 'updateUserRanking').mockResolvedValueOnce(null);

      const result = await raidService.endRaid(raidEndDto);
      expect(result).toBeUndefined();
    });


    // test('DB에서 해당 레이드 기록을 불러올 수 없다면 404 error를 반홥합니다.', async () => {
      
    // });

    // test('보스레이드 정보에 없는 레벨을 요청한 경우 400 error를 반환합니다.', async () => {

    // });

    // test('DB에 존재하지 않는 사용자라면 404 error를 반환합니다.', async () => {

    // });

    // test('레이드 기록을 DB에 저장하지 못한다면 error를 반환합니다.', async () => {

    // });

    // test('랭킹 정보 업데이트에 실패하면 error를 반환합니다.', async () => {

    // });
  });

  describe('checkRaidStatus method', () => {
    let raidStatus: IRaidStatus, userId: number, raidRecordId: number;
    test('레이드 상태가 유효한 경우', () => {
      raidStatus = { canEnter: false, enteredUserId: 1, raidRecordId: 1 };
      userId = 1;
      raidRecordId = 1;

      const result = raidService.checkRaidStatus(raidStatus, userId, raidRecordId);
      expect(result).toBeUndefined();
    });

    test('레이드 상태가 없는 경우', () => {
      raidStatus = null;
      userId = 1;
      raidRecordId = 1;

      const result = raidService.checkRaidStatus(raidStatus, userId, raidRecordId);
      expect(result).toThrow(new NotFoundException(ErrorType.raidStatusNotFound.msg));
      
    });
  });

  // describe('saveRaidRecord method', () => {

  // });

  // describe('getRaidRecordById method', () => {

  // });
});
