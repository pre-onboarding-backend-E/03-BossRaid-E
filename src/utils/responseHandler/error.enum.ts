export const ErrorType = {
  // Auth
  unAuthorized: { code: 401, msg: '로그인 후 이용해주세요' },

  // User
  invalideUser: { code: 400, msg: '유효한 사용자가 아닙니다!' },
  userExists: { code: 400, msg: '이미 존재하는 유저입니다!' },
  userNotFound: { code: 404, msg: '존재하지 않는 유저입니다!' },
  confirmPasswordDoesNotMatch: { code: 400, msg: '비밀번호와 비밀번호 확인이 일치하지 않습니다!' },
  nicknameExist: { code: 409, msg: '해당 닉네임은 이미 사용중입니다!' },
  emailExist: { code: 409, msg: '해당 이메일은 이미 사용중입니다!' },

  // RaidRecord
  raidRecordNotFound: { code: 404, msg: '레이드 기록이 존재하지 않습니다' },
  raidStatusNotFound: { code: 404, msg: '진행 중인 레이드가 없습니다.' },
  raidStatusBadRequest: { code: 400, msg: '진행 중인 레이드 정보와 일치하지 않습니다.' },
  raidStatusForbidden: { code: 400, msg: '레이드에 접근할 수 없습니다.' },
  raidLevelNotFound: { code: 404, msg: '해당 레이드 레벨이 존재하지 않습니다.' },

  // Server
  serverError: { code: 500, msg: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' },
  redisError: { code: 500, msg: '레디스 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요' },
  databaseServerError: { code: 500, msg: '데이터베이스 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요' },

  // Utils
  axiosError: { code: 421, msg: '레이드 정보 json을 불러오지 못했습니다' },
  bullError: { code: 500, msg: 'bull 모듈에 문제가 발생했습니다.' },
};
