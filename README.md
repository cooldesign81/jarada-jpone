# 자라다 JP ONE

자라다 평촌원·반포원·대치원 직원용 운영 포털입니다.
왼쪽은 업무 앱 바로가기, 위 노랑 메뉴는 회사 공통 업무(홈 · 운영지표 · 공지·캘린더 · 워크허브 · 미션허브 · 자료실 · 북마크)입니다.

- 주소: https://cooldesign81.github.io/jarada-jpone/
- 파일: `index.html` 하나 (빌드 도구 없음), 보안 규칙 `firestore.rules`, `storage.rules`

## 처음 설정 (Firebase 프로젝트: jarada-jpone)

1. `index.html` 위쪽 `FIREBASE_CONFIG` 에 jarada-jpone 웹 앱 설정이 들어 있습니다. `apiKey` 를 `"여기에_apiKey_붙여넣기"` 로 바꾸면 로그인 없는 **미리보기 모드**로 열립니다(데이터는 그 브라우저에만 저장).
2. Authentication → 로그인 방법: 이메일/비밀번호, Google 사용. 설정 → 승인된 도메인에 `cooldesign81.github.io`.
3. Authentication → 설정 → 사용자 작업: **가입 허용(Enable create) 켜 두기** — 선생님이 처음 구글로 로그인할 때 필요합니다. 아무나 들어오는 건 아니고, '직원 계정' 목록에 없는 계정은 보안 규칙이 막고 바로 로그아웃됩니다.
4. 원 공용 계정 3개 생성: `jarada_boys@naver.com`(평촌), `jarada-banpo@naver.com`(반포), `jarada-daechi@naver.com`(대치).
5. Firestore 규칙 탭에 `firestore.rules` 붙여넣고 게시.
6. Storage 시작(Blaze 요금제 필요) → 규칙 탭에 `storage.rules` 붙여넣고 게시. 규칙이 Firestore 직원 계정 목록을 보므로, 게시할 때 권한을 물으면 허용.
7. 구글 캘린더 겹쳐 보기: Google Cloud 콘솔(프로젝트 jarada-jpone) → API 및 서비스 → **Google Calendar API 사용**.

## 권한
- 대표(jinhyuck@gmail.com, Google 로그인): 모든 원 읽기·쓰기, 매출·선생님 현황(다른 앱 연결), 자료실 폴더 관리
- 선생님(개인 구글 계정): 대표가 상단 '직원 계정'에 등록한 사람만 로그인. JP People에서 불러오기(미리보기 → 적용) 또는 직접 추가. 권한은 원 계정과 같음
- 원 계정: "모든 원" + 자기 원 읽기, 자기 원만 쓰기. 금액(매출·미납액)은 보이지 않음
- 내 구글 캘린더 겹쳐 보기: 구글로 로그인한 본인 화면에만 보이고 저장하지 않음(원 공용 계정은 사용 불가)
- 원 계정 목록을 바꾸면 `index.html`의 `BRANCH_BY_EMAIL`, `firestore.rules`, `storage.rules` 세 곳을 같이 고칩니다.

## 운영지표 데이터
- 원생 지표: 자라다 시스템 원생 목록 엑셀을 '원생 명단 올리기'로 업로드 → 미리보기 → 적용. 계산 결과만 `portalKpi`(금액은 `portalKpiPrivate`)에 저장
- 매출: 결제 매니저(jarada-checkin) `centers/{원}/ledger` 를 대표 계정으로 읽음
- 선생님 현황: JP People(jarada-people) `employees`, `orgs`, 퇴직일은 `assignments`(상태 → 퇴직)에서 읽음. 개인정보는 읽지 않음

## Firestore 컬렉션
portalNotices · portalEvents · portalTodos · portalFiles · portalFolders · portalBookmarks · portalBmGroups · portalKpi · portalKpiPrivate · portalMembers(문서 ID = 구글 이메일)
(날짜는 모두 "YYYY-MM-DD" 글자로 저장)
