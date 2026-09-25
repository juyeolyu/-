# 이음랜트리 Next.js 홈페이지

React와 Next.js App Router로 만든 홈페이지입니다. 제공받은 Firebase 프로젝트 설정, 네이버 블로그 RSS, 휴대폰 인증 로그인과 문의 접수 기능을 포함합니다.

## 기능

- Firebase Analytics: 브라우저에서 지원 여부를 확인하고 초기화합니다.
- 블로그: 공개 RSS에서 최신 글을 불러와 펼쳐 읽습니다. 피드는 10분 캐시, 화면은 15분마다 갱신합니다.
- 프로젝트 문의: 상단의 프로젝트 문의를 누르면 이름, 전화번호, 문의 내용을 적는 창이 열리고 Firestore에 저장됩니다.
- 문의함: 담당 휴대폰으로 로그인한 뒤 문의 확인 화면에서 새 문의를 실시간으로 봅니다. 새 문의는 확인 완료로 표시할 수 있습니다.

## 로컬 실행

Node.js 20.9 이상에서 실행합니다.

```powershell
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`을 엽니다. Firebase Authentication의 승인 도메인에 `localhost`가 등록되지 않은 경우, Firebase Console에서 직접 추가해야 휴대폰 인증이 동작합니다.

## Firebase 설정

1. Firebase Console → Authentication → Sign-in method에서 **Phone** 제공자를 켜고, SMS 지역 정책에서 허용할 국가를 선택합니다.
2. Authentication → Settings → Authorized domains에 개발용 도메인과 배포 후 사용할 App Hosting 도메인을 등록합니다.
3. Firebase Console에서 Cloud Firestore 데이터베이스를 만듭니다.
4. 이 폴더에서 `firebase deploy --only firestore:rules`를 실행해 `firestore.rules`를 배포합니다. 규칙은 누구나 문의를 접수할 수 있게 하되, 문의 열람과 확인 처리는 회사 담당자 휴대폰만 허용합니다.
5. `components/PhoneAuth.tsx`와 `firestore.rules`의 담당자 번호를 실제 권한자 번호와 맞춥니다. 현재는 블로그에 공개된 회사 휴대폰 `010-4243-3383`, `010-2038-7459`를 사용합니다.

전화번호 로그인은 Firebase가 SMS를 발송하며 문자 요금이나 Firebase 사용량이 적용될 수 있습니다. 개발 중 실제 SMS를 발송하지는 않았습니다.

## Firebase App Hosting 배포

Next.js API 라우트가 있어 Firebase App Hosting을 사용합니다. Firebase Console의 **Hosting & Serverless → App Hosting**에서 백엔드를 만들고 GitHub 저장소와 라이브 브랜치를 연결하세요. App Hosting은 Blaze 요금제를 요구하며 무료 한도를 넘으면 비용이 발생할 수 있습니다. 코드만 준비했으며 계정 설정이나 공개 배포는 하지 않았습니다.
