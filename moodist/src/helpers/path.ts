export function getAssetPath(relativePath: string): string {
  const withoutLeadingSlash = relativePath.replace(/^\/+/, '');
  const baseURL = import.meta.env.BASE_URL;
  const withoutTrailingSlash = baseURL.replace(/\/+$/, '');
  return `${withoutTrailingSlash}/${withoutLeadingSlash}`;
}
