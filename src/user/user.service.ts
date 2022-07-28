import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDTO } from './dto/createUser.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { compare } from 'bcryptjs';
import { ErrorType } from 'src/utils/responseHandler/error.enum';
import { UserInfoDTO } from './dto/userInfo.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * @작성자 김용민
   * @description 비밀번호 체크, 중복 이메일 확인 후 사용자를 추가합니다.
   */
  async createUser(createUserDto: CreateUserDTO): Promise<User> {
    const { email, password, nickname, confirmPassword } = createUserDto;

    if (password !== confirmPassword) {
      throw new BadRequestException(ErrorType.confirmPasswordDoesNotMatch.msg);
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      email,
      nickname,
      password: hashedPassword,
    });

    try {
      await this.userRepository.save(user);

      return user;
    } catch ({ errno, sqlMessage }) {
      if (errno === 1062) {
        if (sqlMessage.includes(email)) {
          throw new ConflictException(ErrorType.emailExist.msg);
        } else if (sqlMessage.includes(nickname)) {
          throw new ConflictException(ErrorType.nicknameExist.msg);
        }
      } else {
        throw new InternalServerErrorException(ErrorType.serverError.msg);
      }
    }
  }

  /**
   * @작성자 김지유
   * @description 유저의 id로 레이드 기록 및 총 점수를 조회합니다.
   */
  async getUserInfo(id: number): Promise<UserInfoDTO | undefined> {
    try {
      // 요구사항의 Response 에 맞게 해당 유저의 totalScore 만 가져옴
      const users = await this.userRepository.find({
        where: { id },
        relations: ['raids'],
        select: ['totalScore'],
      });

      // ReturnType<Repository<User>.find> = User[]
      if (!users.length) {
        throw new NotFoundException(ErrorType.userNotFound.msg);
      }

      // 요구사항의 Response 에 맞게 가공
      const { totalScore, raids } = users[0];
      const bossRaidHistory = raids.map(({ id: raidRecordId, score, enterTime, endTime }) => ({
        raidRecordId,
        score,
        enterTime,
        endTime,
      }));

      const userInfo: UserInfoDTO = { totalScore, bossRaidHistory };

      return userInfo;
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * @작성자 김용민
   * @description 이메일로 사용자를 가져옵니다.
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException(ErrorType.userNotFound.msg);
    }

    return user;
  }

  /**
   * @작성자 박신영
   * @description DB에 발급받은 Refresh Token을 암호화하여 저장(bycrypt)
   */
  async setCurrentRefreshToken(refreshToken: string, email: string) {
    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({ hashedRefreshToken })
      .where('email = :email', { email })
      .execute();
  }

  /**
   * @작성자 박신영
   * @description 데이터베이스 조회 후 Refresh Token이 유효한지 확인
   */
  async getUserRefreshTokenMatches(refreshToken: string, email: string) {
    const user = await this.getUserByEmail(email);
    const isRefreshTokenMatching = await compare(refreshToken, user.hashedRefreshToken);

    if (isRefreshTokenMatching) {
      return user;
    }
  }

  /**
   * @작성자 박신영
   * @description Refresh Token 값을 null로 바꿈
   */
  async removeRefreshToken(id: number) {
    return await this.userRepository.update(id, {
      hashedRefreshToken: null,
    });
  }

  /**
   * @작성자 김용민
   * @description id로 사용자를 가져옵니다.
   */
  async getUserById(userId: number) {
    const user: User = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(ErrorType.userNotFound.msg);
    }

    return user;
  }
}
