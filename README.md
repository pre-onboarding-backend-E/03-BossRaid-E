# 3주차-BossRaid-project :space_invader:

## Redis를 이용한 실시간 게임 참여 및 랭킹 조회 API 개발

<br />

### :bookmark: 목차
- [3주차-BossRaid-project 💫](#3주차-BossRaid-project)
  - [:family: 팀원](#family세상에-e런팀e팀원)
  - [:sunny: ​프로젝트 개요](#sunny-프로젝트-개요)
  - [:question: 요구사항 분석](#question-요구사항-분석)
      - [:lock: 인증](#lock-인증)
      - [:video_game: 보스 레이드](#videogame-보스-레이드)
      - [:file_folder: ETC](#file_folder-etc)
    
  - [:full_moon: ​프로젝트 실행 및 테스트](#fullmoon-프로젝트-실행-및-테스트)
  - [:key: 핵심 기능](#key-핵심-기능)
  - [:cd: 기술 스택](#cd-기술-스택)

<br />

#### :family:세상에 e런팀e\_팀원

| 이름 | Github | email | blog |
| --- | --- | --- | --- |
| 염하늘 | [everchloe97](https://github.com/everchloe97) | star57009@khu.ac.kr | https://velog.io/@everchloe97 |
| 김용민 | [ymink716](https://github.com/ymink716) | ymink716@gmail.com | https://velog.io/@calm0_0 |
| 김태영 | [leokim1178](https://github.com/leokim1178) | leo950906@gmail.com | https://story0tae.tistory.com/ |
| 박신영 | [ParkShinyeong](https://github.com/ParkShinyeong) | syngh503@gmail.com | [신영의 notion](https://sudsy-action-667.notion.site/5ed77b24085f42b8bd1c9e5c0b37d25d) |
| 김지유 | [kgeeeu](https://github.com/scvgood287) | kgeeeu@gmail.com | https://velog.io/@kgeeeu |

<br />

#### :sunny: 프로젝트 개요

Boss Raid PVE 컨텐츠와 관련한 API를 개발합니다. 사용자는 보스레이드를 실행할 수 있으며, 다른 사용자가 보스레이드를 실행 시 시작이 불가능합니다. 보스레이드를 종료하면 점수가 랭킹에 반영됩니다. 3분 이내에 보스레이드를 종료하지 않으면 보스레이드에 실패하며 점수는 반영되지 않습니다.

<br />

#### :question: 요구사항 분석

##### :lock: **인증**

- 회원가입과, 로그인, 로그아웃 API를 개발합니다.
- 로그인하지 않은 사용자는 보스레이드를 이용할 수 없습니다.
- JWT로 Access Token과 Refresh Token을 관리합니다.  
  <br />

##### :video_game: **보스 레이드**

- Create : 보스 레이드를 시작합니다.
- Read: 보스 레이드가 실행 중인지 상태를 확인합니다.
- Read: 보스 레이드 랭킹을 조회합니다.
- Update:보스 레이드를 종료합니다. <br />

##### :file_folder: **ETC**

- [ERD](https://user-images.githubusercontent.com/57704568/179157151-da97740b-8704-4aa1-87dd-5974e8235f4b.png)
- Docker & GCP를 이용한 배포: http://34.64.75.124:3000/api/docs
- Lint, Prettier 포맷팅
- [Ref. Commit Convention](https://github.com/pre-onboarding-backend-E/03-BossRaid-E/wiki/Commit-Convention)
- [Sentry를 활용한 Error 모니터링](https://user-images.githubusercontent.com/57704568/179357140-62f7f00c-fa7c-4599-94ed-af7eb9de9fe8.PNG)

<br />

---

**ENV** 💡

```
  DB_HOST=database-server
  DB_PORT=3308
  DB_USERNAME=root
  DB_PASSWORD=2222
  DB_DATABASE=boss-raid
  JWT_SECRET_KEY= ??
  JWT_EXPIRATION_TIME=1h  (ex / 1h 형식으로 작성합니다.)
  JWT_REFRESH_TOKEN_SECRET= ??
  JWT_REFRESH_TOKEN_EXPIRATION_TIME=10h  (ex / 1h 형식으로 작성합니다.)
  SENTRY_DSN= ??
  NODE_ENV=dev
  STATIC_DATA_URL= ??
  REDIS_PORT=6379
  REDIS_HOST=redis-server
  REDIS_URL= ??
```

- /env/.env 에 다음과 같이 환경 변수를 설정합니다.

---

#### :full_moon: 프로젝트 실행 및 테스트

**1. 실행 방법** 💡

```
cd 03-BossRaid-E /
docker compose build
docker compose up
```

**2. 테스트 방법** 💡

```
yarn test
```

**3. Swagger 테스트 방법** 💡

```
1. swagger (api 문서)
  - localhost:3000/api/docs 접속 - local
  - http://34.64.75.124:3000/api/docs/ 접속 - 배포 링크 (Docker & GCP 이용)

2. sign up을 통해 user를 생성하고 login 후 api를 테스트 할 수 있습니다.
```

<br />

---

#### :key: 핵심 기능

토글을 열어서 기능이 동작하는 gif를 확인할 수 있습니다!

**User (사용자)** 🙍‍♀️🙍‍♂️

<details>
<summary>회원가입</summary>
<div markdown="1">

![회원가입](./images/gif/%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85.gif)

</div>
</details>
<details>
<summary>로그인</summary>
<div markdown="1">

![로그인](./images/gif/%EB%A1%9C%EA%B7%B8%EC%9D%B8.gif)

</div>
</details>

- 로그아웃
- 토큰 재발급

<br />

**Boss Raid (보스 레이드)** :space_invader::video_game:

<details>
<summary>보스 레이드 상태 확인_입장 가능</summary>
<div markdown="1">

![보스 레이드 상태 확인_입장 가능](./images/gif/%EB%A0%88%EC%9D%B4%EB%93%9C%20%EC%83%81%ED%83%9C%EC%A1%B0%ED%9A%8C-%EC%9E%85%EC%9E%A5%EA%B0%80%EB%8A%A5.gif)

</div>
</details>

<details>
<summary>보스 레이드 상태 확인_입장 불가</summary>
<div markdown="1">

![보스 레이드 상태 확인_입장 가능](./images/gif/%EB%A0%88%EC%9D%B4%EB%93%9C%20%EC%83%81%ED%83%9C%EC%A1%B0%ED%9A%8C-%EC%9E%85%EC%9E%A5%EB%B6%88%EA%B0%80.gif)

</div>
</details>

<details>
<summary>보스 레이드 시작</summary>
<div markdown="1">

![보스 레이드 시작](./images/gif/%EB%A0%88%EC%9D%B4%EB%93%9C%20%EC%9E%85%EC%9E%A5.gif)

</div>
</details>

<details>
<summary>보스 레이드 종료</summary>
<div markdown="1">

![보스 레이드 종료](./images/gif/%EB%A0%88%EC%9D%B4%EB%93%9C%20%EC%A2%85%EB%A3%8C.gif)

</div>
</details>

<details>
<summary>보스 레이드 종류 후 상태 확인 _ 입장 가능</summary>
<div markdown="1">

![보스 레이드 종료 후 다시 조회 시 입장 가능](./images/gif/%EC%A2%85%EB%A3%8C%20%ED%9B%84%20%EB%8B%A4%EC%8B%9C%20%EC%A1%B0%ED%9A%8C%EC%8B%9C%20%EC%9E%85%EC%9E%A5%EA%B0%80%EB%8A%A5.gif)

</div>
</details>

<details>
<summary>보스 레이드 랭킹 조회</summary>
<div markdown="1">

![보스 레이드 랭킹 조회](./images/gif/%EB%9E%AD%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8%20%EC%A1%B0%ED%9A%8C.gif)

</div>
</details>

 <br />

---

#### :cd: 기술 스택

<img src="https://img.shields.io/badge/Typescript-3178C6?style=flat&logo=typescript&logoColor=white"/>
<img src="https://img.shields.io/badge/NestJS-E0234E?style=flat&logo=nestjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white"/>
<img src="https://img.shields.io/badge/MySQL-4479A1?style=flat&logo=mysql&logoColor=white"/>
<img src="https://img.shields.io/badge/NodeJS-339933?style=flat&logo=nodejs&logoColor=white"/>
<img src="https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white"/>
<img src="https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white"/>

<br><br/>
