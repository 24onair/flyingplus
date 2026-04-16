export function isEmbedValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.includes("1");
  }

  return value === "1";
}

export function withEmbedParam(path: string, embed?: boolean) {
  if (!embed) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}embed=1`;
}

export function withNextParam(path: string, nextPath?: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}next=${encodeURIComponent(nextPath)}`;
}

export function buildLoginPath(nextPath?: string | null, embed?: boolean) {
  return withNextParam(withEmbedParam("/auth/login", embed), nextPath);
}
