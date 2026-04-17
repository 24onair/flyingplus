import type { Metadata } from "next";
import {
  CopyComplaintButton,
  NewComplaintVersionButton,
} from "@/components/complaint/copy-complaint-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "문경 활공장 민원문 생성",
  description: "문경 활공장 위탁 운영 반대 취지의 국민신문고 민원문을 생성합니다.",
};

const petitionUrl =
  "https://www.epeople.go.kr/index.jsp";

const openings = [
  "문경 활공장의 운영 방식과 관련하여 동호인의 한 사람으로서 깊은 우려를 담아 민원을 드립니다.",
  "문경 활공장이 모든 동호인에게 열려 있는 공공적 공간으로 유지되기를 바라는 마음으로 의견을 제출합니다.",
  "문경 활공장의 개인사업자 위탁 운영에 대해 재검토를 요청드리고자 합니다.",
  "패러글라이딩 동호인들이 함께 이용해 온 문경 활공장의 운영 방향에 관하여 민원을 신청합니다.",
];

const publicValueParagraphs = [
  "문경 활공장은 특정 개인이나 업체만의 영업 공간이라기보다, 지역을 찾는 패러글라이딩 동호인과 방문객이 함께 이용해 온 공공재적 성격의 장소라고 생각합니다. 이러한 공간은 가능한 한 공정하고 투명하게 운영되어야 하며, 이용 기회가 넓게 보장되어야 합니다.",
  "활공장은 항공레저 동호인들이 안전하게 활동하고 지역을 방문하는 기반 시설입니다. 그 성격상 특정 사업자의 이해관계보다 동호인 전체의 접근성, 안전한 이용, 지역 상생이 우선되어야 한다고 봅니다.",
  "문경 활공장은 오래전부터 여러 동호인이 교류하고 비행 문화를 만들어 온 장소입니다. 공공성이 큰 시설인 만큼 운영 기준도 일부 사용자에게 치우치지 않고 누구에게나 예측 가능하게 적용되어야 합니다.",
];

const concernParagraphs = [
  "그런데 개인사업자에게 위탁 운영되는 구조에서는 이용자 선별, 이용 분위기 위축, 신규 동호인의 접근 제한과 같은 문제가 발생할 수 있다는 우려가 있습니다. 실제로 동호인들이 자유롭게 찾기 어려운 환경이 되면 문경을 찾는 비행 인구와 지역 항공레저 문화는 자연스럽게 줄어들 수밖에 없습니다.",
  "개인 업자 중심의 운영은 운영 효율이라는 장점이 있을 수 있으나, 활공장을 이용하는 사람을 사실상 가려 받는 방식으로 흐를 경우 동호인 전체의 신뢰를 잃게 됩니다. 이는 장기적으로 문경 활공장의 활성화에도 도움이 되지 않는다고 생각합니다.",
  "특정 업체의 판단에 따라 이용 경험이 달라진다는 인식이 생기면 동호인들은 다른 지역으로 이동하게 됩니다. 그 결과 문경 활공장의 이용 저변이 좁아지고, 지역을 찾는 동호인과 방문객도 감소할 가능성이 큽니다.",
  "활공장은 비행 동호인의 참여와 협력이 있어야 유지되는 공간입니다. 개인사업자 위탁 운영이 동호인들의 자율적 참여를 약화시키고, 일부 이용자만 편하게 접근하는 구조로 이어진다면 이는 공공시설 운영 취지와 맞지 않습니다.",
];

const requestParagraphs = [
  "따라서 문경 활공장의 개인사업자 위탁 운영을 중단하거나 최소한 전면 재검토해 주시기 바랍니다. 동호인들이 주체가 되어 안전 수칙과 이용 질서를 함께 만들고, 누구나 공정하게 이용할 수 있는 운영 체계로 되돌려 주실 것을 요청드립니다.",
  "문경시와 관계기관께서는 현재의 위탁 운영 방식이 동호인 전체의 이용권을 충분히 보장하고 있는지 살펴봐 주시고, 개인사업자 중심 운영을 멈춘 뒤 동호인 참여형 운영 구조를 마련해 주시기 바랍니다.",
  "공공성이 있는 활공장인 만큼 개인사업자의 영업 편의보다 동호인 전체의 이용 기회가 우선되어야 합니다. 위탁 운영을 중단하고 동호인, 지역사회, 관계기관이 함께 참여하는 투명한 운영 방안을 검토해 주십시오.",
  "문경 활공장이 다시 모든 동호인이 편안하게 찾고 함께 관리하는 장소가 될 수 있도록, 개인사업자 위탁 운영을 멈추고 동호인 중심의 개방적 운영 방식으로 전환해 주시기를 요청드립니다.",
];

const closings = [
  "문경 활공장이 특정인의 공간이 아니라 모두의 안전하고 열린 비행 공간으로 유지될 수 있도록 적극적인 검토와 조치를 부탁드립니다.",
  "동호인들이 문경을 다시 믿고 찾을 수 있도록 관계기관의 책임 있는 판단을 요청드립니다.",
  "지역 항공레저 문화가 위축되지 않도록 조속한 확인과 개선을 부탁드립니다.",
  "이 민원이 문경 활공장의 공공성과 동호인 참여를 회복하는 계기가 되기를 바랍니다.",
];

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function buildComplaint() {
  return [
    pick(openings),
    "",
    pick(publicValueParagraphs),
    "",
    pick(concernParagraphs),
    "",
    pick(requestParagraphs),
    "",
    pick(closings),
  ].join("\n");
}

export default function HomePage() {
  const complaint = buildComplaint();

  return (
    <section className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-5xl flex-col justify-center gap-6 py-6 md:py-10">
      <div className="rounded-[4px] border border-[color:var(--line)] bg-[#050505] p-6 shadow-[rgba(0,0,0,0.3)_0px_0px_5px_0px] md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--accent)]">
              국민신문고 민원문
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-[1.15] text-white md:text-5xl">
              문경 활공장 위탁 운영 반대
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#a7a7a7] md:text-base">
              공공성과 접근성, 동호인 참여를 지키기 위한 의견서를 빠르게 정리하고 바로 제출할 수 있도록 구성한 민원문 생성 도구입니다.
            </p>
          </div>
          <a
            href={petitionUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary w-full sm:w-auto"
          >
            국민신문고 민원신청
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.75fr]">
        <div className="rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-white p-5 shadow-[rgba(0,0,0,0.3)_0px_0px_5px_0px] md:p-7">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold tracking-tight text-black">
            민원 본문
          </h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <NewComplaintVersionButton />
            <CopyComplaintButton text={complaint} />
          </div>
        </div>

        <div className="min-h-[360px] whitespace-pre-wrap rounded-[4px] border border-[color:var(--line)] bg-white p-4 text-[15px] leading-8 text-[#1a1a1a] md:p-6 md:text-base">
          {complaint}
        </div>
        </div>

        <aside className="rounded-[4px] border border-[rgba(255,255,255,0.08)] bg-[#111111] p-5 text-white shadow-[rgba(0,0,0,0.3)_0px_0px_5px_0px] md:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--accent)]">
            작성 포인트
          </p>
          <div className="mt-5 space-y-5">
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">공공성 강조</h3>
              <p className="mt-2 text-sm leading-6 text-[#a7a7a7]">
                활공장을 특정 사업자의 영업 공간이 아니라 모두의 비행 기반 시설로 설명하는 문장 구조를 우선 배치합니다.
              </p>
            </div>
            <div className="border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold">운영 우려 명확화</h3>
              <p className="mt-2 text-sm leading-6 text-[#a7a7a7]">
                이용 위축, 신규 동호인 진입 장벽, 지역 비행 문화 축소 가능성을 핵심 우려로 정리합니다.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold">행정 요청 구체화</h3>
              <p className="mt-2 text-sm leading-6 text-[#a7a7a7]">
                위탁 운영 재검토, 중단, 동호인 참여형 운영 전환처럼 실제 판단 가능한 요청으로 마무리합니다.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
