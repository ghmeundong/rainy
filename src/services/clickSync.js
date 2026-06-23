import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const CHANNEL_NAME = 'rainy-clicks';
const BROADCAST_EVENT = 'ripple-click';
const MESSAGE_VERSION = 1;

let supabaseClient = null;
let clickChannel = null;

function isRealtimeConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function encodeClickMessage(relativeX, relativeY) {
  const buffer = new ArrayBuffer(17);
  const view = new DataView(buffer);
  view.setUint8(0, MESSAGE_VERSION);
  view.setFloat64(1, relativeX, true);
  view.setFloat64(9, relativeY, true);
  return buffer;
}

function decodeClickMessage(buffer) {
  if (!buffer || buffer.byteLength !== 17) return null;
  const view = new DataView(buffer);
  const version = view.getUint8(0);
  if (version !== MESSAGE_VERSION) return null;

  const x = view.getFloat64(1, true);
  const y = view.getFloat64(9, true);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseClient;
}

export async function initClickSync(onRemoteClick) {
  if (!isRealtimeConfigured()) {
    console.info('Supabase realtime config missing (VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY).');
    return { enabled: false };
  }

  if (!clickChannel) {
    const client = getSupabaseClient();
    clickChannel = client.channel(CHANNEL_NAME, { config: { broadcast: { ack: false } } });

    clickChannel.on('broadcast', { event: BROADCAST_EVENT }, (payload) => {
      const encoded = payload?.payload?.data ?? payload?.data;
      if (!encoded) return;
      try {
        const buffer = base64ToArrayBuffer(encoded);
        const decoded = decodeClickMessage(buffer);
        if (decoded) {
          onRemoteClick(decoded);
        }
      } catch (error) {
        console.warn('Failed to decode remote click payload:', error);
      }
    });

    return new Promise((resolve) => {
      clickChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('Supabase realtime click sync connected.');
          resolve({ enabled: true });
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('Supabase realtime click channel error.');
          clickChannel = null;
          resolve({ enabled: false });
        } else if (status === 'TIMED_OUT') {
          console.warn('Supabase realtime click channel timed out.');
          clickChannel = null;
          resolve({ enabled: false });
        }
      });
    });
  }

  return { enabled: clickChannel !== null };
}

export async function sendLocalClick(relativeX, relativeY) {
  if (!clickChannel) return;
  const buffer = encodeClickMessage(relativeX, relativeY);
  const payload = arrayBufferToBase64(buffer);
  try {
    clickChannel.send({
      type: 'broadcast',
      event: BROADCAST_EVENT,
      payload: { data: payload },
    });
  } catch (error) {
    console.warn('Failed to send Supabase realtime click:', error);
  }
}
