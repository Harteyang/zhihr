export function getAssetPath(relativePath: string): string {
  const withoutLeadingSlash = relativePath.replace(/^\/+/, '');

  // Sound files use CDN if SOUNDS_CDN_URL is configured
  if (withoutLeadingSlash.startsWith('sounds/')) {
    const cdnURL = import.meta.env.SOUNDS_CDN_URL;
    if (cdnURL) {
      const withoutTrailingSlash = cdnURL.replace(/\/+$/, '');
      return `${withoutTrailingSlash}/${withoutLeadingSlash}`;
    }
  }

  const baseURL = import.meta.env.BASE_URL;
  const withoutTrailingSlash = baseURL.replace(/\/+$/, '');

  return `${withoutTrailingSlash}/${withoutLeadingSlash}`;
}
