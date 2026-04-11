# IGC Dashboard Prototype

이 폴더는 메인 Next.js 앱과 분리된 IGC 비행 로그 분석 프로토타입입니다.

목표:
- `.igc` 파일을 읽어서
- 비행 요약 데이터를 만들고
- 나중에 "SportsTrackLive 같은 대시보드"로 확장할 수 있는 기본 구조를 검증합니다.

현재 포함 기능:
- IGC 헤더 파싱
- 선언된 Task(C record) 파싱
- 비행 Fix(B record) 파싱
- Naviter/SeeYou `LXNA::PHASE` 이벤트 파싱
- 총 거리, 비행 시간, 최고/최저 고도, 이륙/착륙 추정 등 기본 요약
- CLI 분석 스크립트
- Node 내장 테스트

## 실행

분석:

```bash
node experiments/igc-dashboard/scripts/analyze-igc.mjs "/absolute/path/to/flight.igc"
```

테스트:

```bash
node --test experiments/igc-dashboard/test/*.test.mjs
```

## 출력 예시

CLI는 아래 구조의 JSON을 출력합니다.

```json
{
  "filePath": "...",
  "summary": {
    "pilot": "sunghoon son",
    "glider": "Ozone Swift 6",
    "date": "2024-05-29",
    "fixCount": 6800,
    "taskCount": 8,
    "durationSeconds": 12345,
    "distanceKm": 52.4
  }
}
```

## 다음 단계 제안

이 프로토타입이 괜찮으면 다음 순서로 확장하기 좋습니다.

1. 지도 위 트랙 렌더링용 GeoJSON 출력
2. 고도/속도/상승률 타임라인
3. 선언 Task 대비 실제 비행 비교
4. 여러 비행 로그를 모아 개인 대시보드화
5. 업로드 UI를 별도 앱으로 분리
