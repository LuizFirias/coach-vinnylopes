'use client';

import { supabaseClient } from '@/lib/supabaseClient';

/** Converte a chave pública VAPID (base64url) pro formato que o PushManager espera. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (existing) return existing;
  return navigator.serviceWorker.register('/sw.js');
}

/** Pede permissão (se preciso) e inscreve o usuário pra push. Salva no banco. */
export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Este navegador não suporta notificações push.' };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, error: 'Configuração de push ausente.' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: 'Permissão de notificação negada.' };
    }

    const registration = await registerServiceWorker();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });
    }

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      return { ok: false, error: 'Sessão expirada. Faça login novamente.' };
    }

    const json = subscription.toJSON();
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || 'Não foi possível salvar a inscrição.' };
    }

    return { ok: true };
  } catch (err) {
    console.error('[push] subscribeToPush', err);
    return { ok: false, error: 'Não foi possível ativar as notificações.' };
  }
}

/** Cancela a inscrição push (local + banco). */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    const {
      data: { session },
    } = await supabaseClient.auth.getSession();
    if (!session?.access_token) return;

    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ endpoint }),
    });
  } catch (err) {
    console.error('[push] unsubscribeFromPush', err);
  }
}

/** Estado atual: já existe uma inscrição ativa neste dispositivo/navegador? */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    return Boolean(subscription);
  } catch {
    return false;
  }
}
