import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6 md:py-10">
      <div className="theme-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="theme-kicker">XC Planner</p>
            <h1 className="theme-title mt-2">
              Hike & Fly 현장 판단과
              <br />
              타스크 제작을 한 곳에서
            </h1>
            <p className="theme-copy theme-copy-inverse mt-4 max-w-2xl">
              브리핑, 지역 비교, 코스 제작, 공개 타스크 공유, 활공장 관리까지 실제 비행 준비에 필요한 흐름을 한 화면에서 이어갈 수 있도록 정리한 XC 플래너입니다.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/briefing" className="btn btn-primary">
              브리핑 시작
            </Link>
            <Link href="/tasks/new" className="btn btn-secondary">
              신규 타스크 만들기
            </Link>
          </div>
        </div>
      </div>

      <div className="theme-grid-3">
        <article className="theme-panel">
          <p className="theme-kicker theme-kicker-muted">브리핑</p>
          <h2 className="theme-subtitle">오늘 조건 빠르게 판단</h2>
          <p className="theme-copy mt-3">
            Open-Meteo 기준으로 풍향, 풍속, 써멀, 베이스를 묶어 지역별 XC 가능성을 빠르게 확인합니다.
          </p>
        </article>
        <article className="theme-panel">
          <p className="theme-kicker theme-kicker-muted">타스크</p>
          <h2 className="theme-subtitle">현장에서 바로 제작</h2>
          <p className="theme-copy mt-3">
            지도 검색, 커스텀 포인트, XCTrack QR과 파일 내보내기까지 한 흐름으로 이어집니다.
          </p>
        </article>
        <article className="theme-panel">
          <p className="theme-kicker theme-kicker-muted">활공장</p>
          <h2 className="theme-subtitle">지역 자산 축적</h2>
          <p className="theme-copy mt-3">
            활공장 정보, 풍향 범위, 웨이포인트와 운영 메모를 지속적으로 업데이트할 수 있습니다.
          </p>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="theme-panel">
          <p className="theme-kicker theme-kicker-muted">빠른 시작</p>
          <h2 className="theme-subtitle">자주 쓰는 흐름</h2>
          <div className="mt-5 grid gap-3">
            <Link href="/briefing" className="theme-callout theme-link no-underline">
              <strong className="block text-[color:var(--text-primary)]">브리핑 보기</strong>
              <span className="theme-copy mt-1 block">대표 지역을 선택해 오늘의 비행 조건을 먼저 확인합니다.</span>
            </Link>
            <Link href="/compare" className="theme-callout theme-link no-underline">
              <strong className="block text-[color:var(--text-primary)]">지역 비교</strong>
              <span className="theme-copy mt-1 block">문경, 합천, 울산 고헌산 등 후보 지역을 한 번에 비교합니다.</span>
            </Link>
            <Link href="/tasks" className="theme-callout theme-link no-underline">
              <strong className="block text-[color:var(--text-primary)]">타스크 보기</strong>
              <span className="theme-copy mt-1 block">공개 타스크와 저장된 타스크를 둘러보고 상세 화면으로 이동합니다.</span>
            </Link>
            <Link href="/sites" className="theme-callout theme-link no-underline">
              <strong className="block text-[color:var(--text-primary)]">활공장 보기</strong>
              <span className="theme-copy mt-1 block">활공장 목록, 지도, 풍향 범위, 링크, 웨이포인트 도구로 이동합니다.</span>
            </Link>
          </div>
        </section>

        <aside className="theme-panel-dark">
          <p className="theme-kicker">별도 도구</p>
          <h2 className="theme-subtitle text-white">운영 이슈 대응 도구</h2>
          <p className="theme-copy theme-copy-inverse mt-3">
            홈과 분리해서, 문경 활공장 관련 국민신문고 민원문 생성 도구는 별도 페이지로 이동했습니다.
          </p>
          <div className="mt-5">
            <Link href="/complaints/mungyeong" className="btn btn-secondary w-full">
              민원문 생성 페이지 열기
            </Link>
          </div>
          <div className="theme-callout mt-5">
            <p className="theme-label mb-1 text-[color:var(--text-primary)]">현재 홈 목적</p>
            <p className="theme-copy">
              이 홈은 XC Planner의 실제 진입점으로 유지하고, 개별 캠페인/운영 도구는 별도 경로로 분리합니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
