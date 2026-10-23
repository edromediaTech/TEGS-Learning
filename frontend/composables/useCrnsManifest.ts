// Helper unique pour resoudre l'URL du manifest des simulations CRNS.
// - En dev/prod par defaut : /simulations/manifest.json (bundle local)
// - Override via NUXT_PUBLIC_CRNS_MANIFEST_URL pour pointer sur GCS public.
//
// Cache-buster : on append un timestamp a granularite 30s. Cela permet
// au CDN GCS de mettre en cache 30s pour ne pas saturer, mais garantit
// qu'un nouvel upload sera visible dans la minute suivante quoi qu'il
// arrive (le manifest GCS sert encore parfois `max-age=3600` cote edge).

export function useCrnsManifestUrl(): string {
  const config = useRuntimeConfig();
  const cdnBase = (config.public as any).crnsManifestUrl as string;
  const base = cdnBase && cdnBase.startsWith('http') ? cdnBase : '/simulations/manifest.json';
  const bucket = Math.floor(Date.now() / 30000);
  return `${base}${base.includes('?') ? '&' : '?'}t=${bucket}`;
}
