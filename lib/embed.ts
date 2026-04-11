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
