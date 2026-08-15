import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'store.json');

fs.mkdirSync(dataDir, { recursive: true });

function load() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return { channels: {}, messages: {} };
  }
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data));
}

const defaultPlayback = () => ({
  videoId: null,
  title: null,
  isPlaying: false,
  currentTime: 0,
  updatedAt: Date.now(),
});

export function createChannel({ id, name, adminToken }) {
  const data = load();
  data.channels[id] = {
    id,
    name,
    adminToken,
    createdAt: Date.now(),
    playback: defaultPlayback(),
  };
  data.messages[id] = [];
  save(data);
  return getChannel(id);
}

export function getChannel(id) {
  const data = load();
  const row = data.channels[id];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    adminToken: row.adminToken,
    createdAt: row.createdAt,
    playback: row.playback || defaultPlayback(),
  };
}

export function updatePlayback(channelId, playback) {
  const data = load();
  if (!data.channels[channelId]) return playback;
  data.channels[channelId].playback = playback;
  save(data);
  return playback;
}

export function addMessage({ id, channelId, userId, displayName, text, createdAt }) {
  const data = load();
  if (!data.messages[channelId]) data.messages[channelId] = [];
  const msg = { id, channelId, userId, displayName, text, createdAt };
  data.messages[channelId].push(msg);
  if (data.messages[channelId].length > 200) {
    data.messages[channelId] = data.messages[channelId].slice(-200);
  }
  save(data);
  return msg;
}

export function getMessages(channelId, limit = 100) {
  const data = load();
  const list = data.messages[channelId] || [];
  return list.slice(-limit);
}

export function deleteChannel(channelId) {
  const data = load();
  delete data.channels[channelId];
  delete data.messages[channelId];
  save(data);
}
