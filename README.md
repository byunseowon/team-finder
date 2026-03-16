# Team Finder - Unreal 7기 팀 빌딩 웹앱

Unreal Engine 부트캠프 7기 수강생들의 팀 빌딩을 위한 웹 애플리케이션입니다.
수강생들이 서로의 프로필을 탐색하고, 자유롭게 팀을 구성할 수 있습니다.

## 주요 기능

- **프로필 관리**: 역량, 희망 장르, 게임 컨셉, 협업 스타일 등록
- **인원 탐색**: 이름/장르 기반 검색, 관심 표시
- **구인구직 보드**: 팀원 모집(구인) 및 팀 탐색(구직) 게시판
- **팀 관리**: 자유 팀 생성, 팀장의 팀원 추가, 1인 1팀 제한
- **팀 현황**: 전체 팀 구성 현황 대시보드
- **관리자**: 수강생 명단 관리(직접 입력/엑셀 업로드), 공통 비밀번호, 팀 인원 설정, 잠금 기능

## 기술 스택

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel

## 실행 방법

```bash
npm install
npm run dev
```

`.env.local` 파일에 Supabase 환경 변수 설정이 필요합니다.

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
