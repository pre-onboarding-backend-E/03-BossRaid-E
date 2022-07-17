import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { RaidRecord } from './entities/raid.entity';
import { RaidController } from './raid.controller';
import { RaidService } from './raid.service';
import { BullModule } from '@nestjs/bull';
import { RaidConsumer } from './raid.consumer';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaidRecord, User]),
    BullModule.forRootAsync({
      useFactory: () => ({
        redis: {
          host: process.env.REDIS_HOST,
          port: +process.env.REDIS_PORT,
        },
      }),
    }),
    /*
    1. Queue constructor 
    - queue 생성자로 redis에 유지되는 새 큐를 만듭니다.
    - queue 생성 시 option을 지정할 수 있습니다. (https://github.com/OptimalBits/bull/blob/master/REFERENCE.md#queue)
    */
    BullModule.registerQueue({
      name: 'playerQueue',
      defaultJobOptions: {
        removeOnFail: true, //실패한 작업 자동 삭제
      },
    }),
  ],
  controllers: [RaidController],
  providers: [RaidService, RaidConsumer, UserService],
})
export class RaidModule {}
