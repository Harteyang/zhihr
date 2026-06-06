const DEFAULT_SOUNDS_CDN = 'https://cdn.jsdelivr.net/gh/remvze/moodist@main/public/sounds';

export function getAssetPath(relativePath: string): string {
  const withoutLeadingSlash = relativePath.replace(/^\/+/, '');

  // Sound files always use CDN (jsdelivr from original moodist repo by default)
  if (withoutLeadingSlash.startsWith('sounds/')) {
    const cdnURL = import.meta.env.SOUNDS_CDN_URL || DEFAULT_SOUNDS_CDN;
    const withoutTrailingSlash = cdnURL.replace(/\/+$/, '');
    return `${withoutTrailingSlash}/${withoutLeadingSlash}`;
  }

  const baseURL = import.meta.env.BASE_URL;
  const withoutTrailingSlash = baseURL.replace(/\/+$/, '');

  return `${withoutTrailingSlash}/${withoutLeadingSlash}`;
}
