import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import {
  createChannel,
  getChannel,
  updatePlayback,
  addMessage,
  getMessages,
} from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10);
const tokenId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 24);
const PORT = process.env.PORT || 3001;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

/** channelId -> Map(socketId -> { userId, displayName, isAdmin }) */
const rooms = new Map();

function getRoomMembers(channelId) {
  const room = rooms.get(channelId);
  if (!room) return [];
  return [...room.values()].map(({ userId, displayName, isAdmin }) => ({
    userId,
    displayName,
    isAdmin,
  }));
}

function broadcastMembers(channelId) {
  io.to(channelId).emit('members', getRoomMembers(channelId));
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/youtube/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Missing query' });

  if (!YOUTUBE_API_KEY) {
    return res.status(503).json({
      error: 'YouTube search is not configured. Paste a YouTube URL instead, or set YOUTUBE_API_KEY.',
      results: [],
    });
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('videoCategoryId', '10');
    url.searchParams.set('maxResults', '12');
    url.searchParams.set('q', q);
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(url, {
      headers: {
        // Keys restricted to HTTP referrers need a referer; server-side calls are empty otherwise.
        Referer: process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}/`,
        Origin: process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({
        error: data?.error?.message || 'YouTube API error',
        results: [],
      });
    }

    const results = (data.items || []).map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    }));
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message, results: [] });
  }
});

app.get('/api/channels/:id', (req, res) => {
  const channel = getChannel(req.params.id);
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  res.json({
    id: channel.id,
    name: channel.name,
    playback: channel.playback,
    memberCount: getRoomMembers(channel.id).length,
  });
});

io.on('connection', (socket) => {
  let currentChannelId = null;

  socket.on('create_channel', ({ name, displayName, userId }, ack) => {
    try {
      const channelName = String(name || 'Jam session').trim().slice(0, 60) || 'Jam session';
      const display = String(displayName || 'Host').trim().slice(0, 32) || 'Host';
      const uid = String(userId || nanoid()).slice(0, 40);
      const id = nanoid();
      const adminToken = tokenId();

      createChannel({ id, name: channelName, adminToken });

      if (!rooms.has(id)) rooms.set(id, new Map());
      rooms.get(id).set(socket.id, { userId: uid, displayName: display, isAdmin: true });
      currentChannelId = id;
      socket.join(id);

      const channel = getChannel(id);
      const payload = {
        channel: {
          id: channel.id,
          name: channel.name,
          playback: channel.playback,
        },
        userId: uid,
        displayName: display,
        isAdmin: true,
        adminToken,
        messages: [],
        members: getRoomMembers(id),
      };
      if (typeof ack === 'function') ack({ ok: true, ...payload });
      broadcastMembers(id);
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  socket.on('join_channel', ({ channelId, displayName, userId, adminToken }, ack) => {
    try {
      const channel = getChannel(channelId);
      if (!channel) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Channel not found' });
        return;
      }

      const display = String(displayName || 'Guest').trim().slice(0, 32) || 'Guest';
      const uid = String(userId || nanoid()).slice(0, 40);
      const isAdmin = Boolean(adminToken && adminToken === channel.adminToken);

      if (currentChannelId) {
        leaveCurrent();
      }

      if (!rooms.has(channel.id)) rooms.set(channel.id, new Map());
      rooms.get(channel.id).set(socket.id, {
        userId: uid,
        displayName: display,
        isAdmin,
      });
      currentChannelId = channel.id;
      socket.join(channel.id);

      const systemMsg = addMessage({
        id: nanoid(),
        channelId: channel.id,
        userId: 'system',
        displayName: 'System',
        text: `${display} joined`,
        createdAt: Date.now(),
      });
      io.to(channel.id).emit('chat_message', systemMsg);

      const payload = {
        channel: {
          id: channel.id,
          name: channel.name,
          playback: channel.playback,
        },
        userId: uid,
        displayName: display,
        isAdmin,
        adminToken: isAdmin ? channel.adminToken : null,
        messages: getMessages(channel.id),
        members: getRoomMembers(channel.id),
      };
      if (typeof ack === 'function') ack({ ok: true, ...payload });
      broadcastMembers(channel.id);
      socket.emit('playback_state', channel.playback);
    } catch (err) {
      if (typeof ack === 'function') ack({ ok: false, error: err.message });
    }
  });

  socket.on('chat_message', ({ text }, ack) => {
    if (!currentChannelId) return;
    const room = rooms.get(currentChannelId);
    const member = room?.get(socket.id);
    if (!member) return;

    const cleaned = String(text || '').trim().slice(0, 500);
    if (!cleaned) return;

    const msg = addMessage({
      id: nanoid(),
      channelId: currentChannelId,
      userId: member.userId,
      displayName: member.displayName,
      text: cleaned,
      createdAt: Date.now(),
    });
    io.to(currentChannelId).emit('chat_message', msg);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('set_display_name', ({ displayName }, ack) => {
    if (!currentChannelId) return;
    const room = rooms.get(currentChannelId);
    const member = room?.get(socket.id);
    if (!member) return;
    member.displayName = String(displayName || 'Guest').trim().slice(0, 32) || 'Guest';
    broadcastMembers(currentChannelId);
    if (typeof ack === 'function') ack({ ok: true, displayName: member.displayName });
  });

  socket.on('playback_update', (state, ack) => {
    if (!currentChannelId) return;
    const room = rooms.get(currentChannelId);
    const member = room?.get(socket.id);
    if (!member?.isAdmin) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Only the host can control playback' });
      return;
    }

    const channel = getChannel(currentChannelId);
    if (!channel) return;

    const playback = {
      videoId: state.videoId ?? channel.playback.videoId,
      title: state.title ?? channel.playback.title,
      isPlaying: Boolean(state.isPlaying),
      currentTime: Number(state.currentTime) || 0,
      updatedAt: Date.now(),
    };
    updatePlayback(currentChannelId, playback);
    socket.to(currentChannelId).emit('playback_state', playback);
    if (typeof ack === 'function') ack({ ok: true, playback });
  });

  socket.on('request_playback', () => {
    if (!currentChannelId) return;
    const channel = getChannel(currentChannelId);
    if (channel) socket.emit('playback_state', channel.playback);
  });

  function leaveCurrent() {
    if (!currentChannelId) return;
    const room = rooms.get(currentChannelId);
    const member = room?.get(socket.id);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) rooms.delete(currentChannelId);
    }
    socket.leave(currentChannelId);
    if (member) {
      const systemMsg = addMessage({
        id: nanoid(),
        channelId: currentChannelId,
        userId: 'system',
        displayName: 'System',
        text: `${member.displayName} left`,
        createdAt: Date.now(),
      });
      io.to(currentChannelId).emit('chat_message', systemMsg);
      broadcastMembers(currentChannelId);
    }
    currentChannelId = null;
  }

  socket.on('leave_channel', () => leaveCurrent());
  socket.on('disconnect', () => leaveCurrent());
});

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

server.listen(PORT, () => {
  console.log(`SyncWave listening on http://localhost:${PORT}`);
  if (!YOUTUBE_API_KEY) {
    console.log('Note: YOUTUBE_API_KEY not set — search disabled; paste YouTube URLs to play.');
  }
});
