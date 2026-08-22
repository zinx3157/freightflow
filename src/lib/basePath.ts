// Shared URL helpers for root hosting and GitHub Pages project hosting.
// NEXT_PUBLIC_BASE_PATH is set to /freightflow by deploy-gh-pages.sh.
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '');

export function withBasePath(path = '/'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${cleanPath}` || '/';
}

export function withoutBasePath(pathname: string): string {
  if (basePath && pathname === basePath) return '/';
  if (basePath && pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/';
  return pathname || '/';
}
