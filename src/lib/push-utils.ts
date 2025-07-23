import { subscribeUser, sendNotification } from './actions';

const SERVICE_WORKER_FILE_PATH = '/sw.js';

export function notificationUnsupported(): boolean {
  let unsupported = false;
  
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('showNotification' in ServiceWorkerRegistration.prototype)
  ) {
    unsupported = true;
  }
  
  // Check if we're on HTTPS or localhost
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    console.warn('Push notifications require HTTPS or localhost');
    unsupported = true;
  }
  
  return unsupported;
}

export function checkPermissionStateAndAct(
  onSubscribe: (subs: PushSubscription | null) => void,
): void {
  const state: NotificationPermission = Notification.permission;
  
  switch (state) {
    case 'denied':
      break;
    case 'granted':
      registerAndSubscribe(onSubscribe);
      break;
    case 'default':
      break;
  }
}

async function registerAndSubscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.register(SERVICE_WORKER_FILE_PATH, {
      updateViaCache: 'none' // Force update
    });
    
    // Force update if there's a waiting service worker
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    await subscribe(onSubscribe);
  } catch (e) {
    console.error('Failed to register service-worker: ', e);
  }
}

async function subscribe(onSubscribe: (subs: PushSubscription | null) => void): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    if (!vapidKey) {
      throw new Error('VAPID public key not found in environment variables');
    }
    
    // Check if we already have a subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      const serializedSubscription = existingSubscription.toJSON();
      if (serializedSubscription.endpoint && serializedSubscription.keys?.p256dh && serializedSubscription.keys?.auth) {
        const result = await subscribeUser({
          endpoint: serializedSubscription.endpoint,
          keys: {
            p256dh: serializedSubscription.keys.p256dh,
            auth: serializedSubscription.keys.auth
          }
        });
        if (result.success) {
          onSubscribe(existingSubscription);
          return;
        }
      }
    }
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    
    // Submit subscription to server using Server Action (serialize first)
    const serializedSubscription = subscription.toJSON();
    if (serializedSubscription.endpoint && serializedSubscription.keys?.p256dh && serializedSubscription.keys?.auth) {
      const result = await subscribeUser({
        endpoint: serializedSubscription.endpoint,
        keys: {
          p256dh: serializedSubscription.keys.p256dh,
          auth: serializedSubscription.keys.auth
        }
      });
      if (result.success) {
        onSubscribe(subscription);
      } else {
        console.error('Failed to store subscription:', result.error);
        onSubscribe(null);
      }
    } else {
      console.error('Invalid subscription data');
      onSubscribe(null);
    }
  } catch (error) {
    console.error('Failed to subscribe:', error);
    onSubscribe(null);
  }
}

// Helper function to send push notifications using Server Action
export async function sendWebPush(message: string) {
  const result = await sendNotification(message);
  if (!result.success) {
    console.error('Failed to send push notification:', result.error);
  }
  return result;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export { registerAndSubscribe };