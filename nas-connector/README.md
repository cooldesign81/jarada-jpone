# 자라다 NAS 커넥터 (대치원 서버 PC)

JP ONE 미션허브에 교사가 제출한 파일을 학원 NAS(ipTIME NAS2dual)의 교사 폴더에 자동으로 저장해요.
원본은 Firebase에 그대로 남고, NAS에는 `JARADA_ONE/교사/{이름}/미션허브/{연도}/{미션}/v{번호}/` 로 쌓여요.

## 설치 순서 (윈도우 11, 처음 한 번)
1. **Node.js LTS** 설치: https://nodejs.org → LTS 버튼 → 설치(기본값으로 다음 다음)
2. 이 폴더(`nas-connector`)를 서버 PC의 `C:\jarada\nas-connector` 로 복사
3. **NAS 전용 계정** 만들기: NAS 관리 화면에서 `jarada-sync` 같은 계정을 만들고, `JARADA` 공유 폴더에 읽기·쓰기 권한만 줘요
4. **서비스 키** 받기: Firebase 콘솔 → jarada-jpone → 프로젝트 설정(톱니) → 서비스 계정 → "새 비공개 키 생성" → 받은 파일 이름을 `service-account.json` 으로 바꿔 이 폴더에 넣기
   - 이 키는 JP ONE 데이터 전체에 접근할 수 있어요. 이 PC 밖으로 옮기거나 메신저로 보내지 마세요.
5. `config.example.json` 을 복사해 `config.json` 으로 이름을 바꾸고 NAS 주소·계정을 적기
   - 공유 폴더 방식(권장): `"mode": "smb"`, `"root": "\\\\NAS IP\\공유폴더이름"`
6. 명령 프롬프트를 **관리자 권한**으로 열고:
   ```
   cd C:\jarada\nas-connector
   npm install
   npm run test-nas          ← "NAS 쓰기·읽기 시험 성공"이 나오면 OK
   node install-service.js   ← 윈도우 서비스로 등록(PC 켜면 자동 시작)
   ```

## 확인
- JP ONE 미션허브(대표 화면) 위쪽에 "NAS 커넥터: 마지막 연결 …" 이 보여요.
- 기록: `logs\YYYY-MM.log`
- 멈추기/지우기: `node uninstall-service.js`

## 문제가 생기면
- "NAS 시험 실패": 탐색기 주소창에 `\\NAS IP\공유폴더` 를 넣어 열리는지, 계정·비밀번호가 맞는지 확인
- 실패한 파일은 JP ONE에서 "NAS 실패"로 보이고, 원본은 Firebase에 있으니 사라지지 않아요.
