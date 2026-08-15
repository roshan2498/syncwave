const SESSION_KEY = 'syncwave_session';
const CHANNELS_KEY = 'syncwave_channels';

function randomId() {
  return crypto.randomUUID?.() || `u_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateUserId() {
  const session = loadSession();
  if (session.userId) return session.userId;
  const userId = randomId();
  saveSession({ ...session, userId });
  return userId;
}

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveSession(partial) {
  const next = { ...loadSession(), ...partial };
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

export function rememberChannel({ channelId, name, adminToken, displayName }) {
  const map = loadChannelMap();
  map[channelId] = {
    channelId,
    name,
    adminToken: adminToken || map[channelId]?.adminToken || null,
    displayName: displayName || map[channelId]?.displayName || null,
    lastJoinedAt: Date.now(),
  };
  localStorage.setItem(CHANNELS_KEY, JSON.stringify(map));
  saveSession({
    lastChannelId: channelId,
    displayName: displayName || loadSession().displayName,
  });
}

export function loadChannelMap() {
  try {
    return JSON.parse(localStorage.getItem(CHANNELS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getChannelMemory(channelId) {
  return loadChannelMap()[channelId] || null;
}

export function clearLastChannel() {
  const session = loadSession();
  delete session.lastChannelId;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function extractVideoId(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.slice(1).split('/')[0] || null;
    }
    if (url.searchParams.get('v')) return url.searchParams.get('v');
    const shorts = url.pathname.match(/\/(?:shorts|embed|live)\/([a-zA-Z0-9_-]{11})/);
    if (shorts) return shorts[1];
  } catch {
    return null;
  }
  return null;
}
