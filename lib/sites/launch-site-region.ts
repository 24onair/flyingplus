import type { KoreaLaunchSite } from "@/types/launch-site";

export function detectLaunchSiteRegion(site: KoreaLaunchSite) {
  const text = `${site.sourceName} ${site.descriptionText}`.toLowerCase();

  const regionMatchers: Array<[string, string[]]> = [
    ["서울·경기·인천", ["서울", "경기", "수원", "양평", "가평", "용인", "인천", "파주", "포천", "연천"]],
    ["강원", ["강원", "강릉", "평창", "횡성", "영월", "정선", "홍천", "원주", "춘천", "삼척", "양양"]],
    ["충북", ["충북", "충주", "단양", "제천", "보은", "옥천", "청주", "괴산", "영동"]],
    ["충남·대전·세종", ["충남", "대전", "세종", "천안", "공주", "서산", "논산", "보령", "당진", "금산"]],
    ["전북", ["전북", "전주", "익산", "남원", "정읍", "임실", "완주", "무주", "장수"]],
    ["전남·광주", ["전남", "광주", "순천", "여수", "곡성", "담양", "화순", "강진", "해남", "영암", "구례"]],
    ["경북·대구", ["경북", "대구", "문경", "상주", "영주", "안동", "예천", "청송", "포항", "구미", "김천", "경산"]],
    ["경남·부산·울산", ["경남", "부산", "울산", "밀양", "양산", "합천", "의령", "거창", "진주", "함안", "김해", "사천"]],
    ["제주", ["제주", "서귀포"]],
  ];

  const matched = regionMatchers.find(([, keywords]) =>
    keywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );

  return matched?.[0] ?? "미분류";
}
