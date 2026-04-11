export function extractLaunchSiteWindHint(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  const match = compact.match(
    /이륙장\s*-\s*([^\n(]+?(?:풍|북동|북서|남동|남서)(?:\s*[/,.]\s*[^\n(]+?(?:풍|북동|북서|남동|남서))*)/u
  );

  if (!match) {
    return null;
  }

  return match[1]
    .replace(/[.,]/g, " / ")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}
