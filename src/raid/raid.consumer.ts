import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

/**
 * @작성자 박신영
 * @description Queue에서 보스 레이드를 진행할 유저들을 체크합니다.
 */
@Processor('playerQueue')
export class RaidConsumer {
  private readonly logger = new Logger(RaidConsumer.name);

  @Process('player')
  async handleQueue(job: Job) {
    this.logger.log(`${JSON.stringify(job.data)}가 추가되었습니다. `);
  }
}
