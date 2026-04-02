# 📍 갈래말래 (Galrae Mallae)
### 어디 갈까 고민될 때, 우리들의 실시간 장소 투표 서비스

<div align="center">
  <img src="public/logo.png" width="200" alt="갈래말래 로고" />
  <p><em>"결정 장애는 이제 그만, 투표로 정해요!"</em></p>
</div>

---

## 🚀 주요 기능

### 1. 실시간 장소 검색 및 지도 인터랙션
- **카카오 로컬 API 연동**: 주변 맛집, 카페, 명소를 실시간으로 검색합니다.
- **무한 스크롤**: 끊김 없는 검색 결과 탐색이 가능합니다.
- **지도에서 즉시 추가**: 지도 위의 핀을 클릭하여 즉각적으로 후보지에 등록할 수 있습니다.
- **위치 기반 필터**: 식당, 카페 등 카테고리별 빠른 필터링을 지원합니다.

### 2. 투표 및 방 관리
- **간편한 방 생성**: 투표 제목, 마감 시간, 정책(중복 투표 등)을 자유롭게 설정합니다.
- **실시간 투표 현황**: 참여 인원과 현재 득표수를 실시간 바 차트로 확인할 수 있습니다.
- **투표 가속도**: 'MY VOTE' 표시와 애니메이션 효과로 직관적인 피드백을 제공합니다.
- **초대 링크 공유**: 고유한 Hashed ID를 통해 친구들에게 빠르게 공유합니다.

### 3. 유연한 사용자 경험
- **카카오 로그인**: 별도의 가입 없이 빠르고 안전하게 참여합니다.
- **모바일 최적화**: 어떤 기기에서도 쾌적하게 사용할 수 있는 반응형 UI/UX.
- **다크 모드 지향**: 눈이 편안한 Slate & Orange 테마의 프리미엄 디자인.

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes, MongoDB
- **Auth**: Next-Auth (Kakao Provider)
- **Maps**: Kakao Maps SDK
- **Icons**: Lucide React, Custom SVG Icons

---

## 🏃 Getting Started

1. **환경 변수 설정 (`.env.local`)**
   ```env
   MONGODB_URI=your_mongodb_uri
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_secret
   KAKAO_CLIENT_ID=your_id
   KAKAO_CLIENT_SECRET=your_secret
   NEXT_PUBLIC_KAKAO_APP_KEY=your_js_key
   ```

2. **의존성 설치 및 실행**
   ```bash
   npm install
   npm run dev
   ```

3. **접속**
   - 브라우저에서 `http://localhost:3000` 접속

---

© 2026 갈래말래. 모든 권리 보유.
