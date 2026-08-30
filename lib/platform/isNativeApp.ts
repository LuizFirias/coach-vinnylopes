/**
 * Detecta app nativo (Capacitor) sem depender do pacote em build web.
 * Usado no fluxo coach→AURON para não iniciar checkout in-app (Apple IAP).
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const cap = (
      window as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
      }
    ).Capacitor;
    return typeof cap?.isNativePlatform === "function" && Boolean(cap.isNativePlatform());
  } catch {
    return false;
  }
}
