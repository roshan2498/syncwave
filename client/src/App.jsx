import { useCallback, useEffect, useMemo, useState } from 'react';
import Room from './Room.jsx';
import { getSocket } from './socket.js';
import {
  clearLastChannel,
  getChannelMemory,
  getOrCreateUserId,
  loadSession,
  rememberChannel,
  saveSession,
} from './session.js';
import './index.css';

function getChannelIdFromPath() {
  const match = window.location.pathname.match(/^\/c\/([a-z0-9]+)/i);
  return match ? match[1] : null;
}

export default function App() {
  const [view, setView] = useState('home'); // home | room | joining
  const [channelName, setChannelName] = useState('');
  const [displayName, setDisplayName] = useState(() => loadSession().displayName || '');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [channel, setChannel] = useState(null);
  const [userId, setUserId] = useState(() => getOrCreateUserId());
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [playback, setPlayback] = useState(null);
  const [connected, setConnected] = useState(false);

  const pathChannelId = useMemo(() => getChannelIdFromPath(), []);

  const enterRoom = useCallback((payload) => {
    setChannel(payload.channel);
    setUserId(payload.userId);
    setDisplayName(payload.displayName);
    setIsAdmin(payload.isAdmin);
    setMembers(payload.members || []);
    setMessages(payload.messages || []);
    setPlayback(payload.channel.playback || null);
    setView('room');
    setError('');

    rememberChannel({
      channelId: payload.channel.id,
      name: payload.channel.name,
      adminToken: payload.adminToken,
      displayName: payload.displayName,
    });
    saveSession({ userId: payload.userId, displayName: payload.displayName });

    const nextPath = `/c/${payload.channel.id}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMembers = (list) => setMembers(list);
    const onChat = (msg) => setMessages((prev) => [...prev, msg]);
    const onPlayback = (state) => setPlayback(state);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('members', onMembers);
    socket.on('chat_message', onChat);
    socket.on('playback_state', onPlayback);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('members', onMembers);
      socket.off('chat_message', onChat);
      socket.off('playback_state', onPlayback);
    };
  }, []);

  useEffect(() => {
    if (!connected || view === 'room') return;

    const channelId = pathChannelId || loadSession().lastChannelId;
    if (!channelId) return;

    const memory = getChannelMemory(channelId);
    const name = displayName || memory?.displayName || loadSession().displayName || 'Guest';
    setView('joining');
    setBusy(true);

    getSocket().emit(
      'join_channel',
      {
        channelId,
        displayName: name,
        userId: getOrCreateUserId(),
        adminToken: memory?.adminToken || null,
      },
      (res) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.error || 'Could not rejoin channel');
          setView('home');
          clearLastChannel();
          if (pathChannelId) window.history.replaceState({}, '', '/');
          return;
        }
        enterRoom(res);
      }
    );
  }, [connected, pathChannelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createChannel = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    getSocket().emit(
      'create_channel',
      {
        name: channelName,
        displayName: displayName || 'Host',
        userId: getOrCreateUserId(),
      },
      (res) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.error || 'Failed to create channel');
          return;
        }
        enterRoom(res);
      }
    );
  };

  const joinChannel = (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    let id = joinCode.trim();
    try {
      if (id.includes('/c/')) {
        id = new URL(id, window.location.origin).pathname.split('/c/')[1]?.split(/[/?#]/)[0] || id;
      }
    } catch {
      /* keep raw */
    }

    const memory = getChannelMemory(id);
    getSocket().emit(
      'join_channel',
      {
        channelId: id,
        displayName: displayName || 'Guest',
        userId: getOrCreateUserId(),
        adminToken: memory?.adminToken || null,
      },
      (res) => {
        setBusy(false);
        if (!res?.ok) {
          setError(res?.error || 'Failed to join');
          return;
        }
        enterRoom(res);
      }
    );
  };

  const onPlaybackUpdate = (state) => {
    setPlayback((prev) => ({ ...prev, ...state, updatedAt: Date.now() }));
    getSocket().emit('playback_update', state);
  };

  const onSendChat = (text) => {
    getSocket().emit('chat_message', { text });
  };

  const onLeave = () => {
    getSocket().emit('leave_channel');
    clearLastChannel();
    setChannel(null);
    setMessages([]);
    setMembers([]);
    setPlayback(null);
    setIsAdmin(false);
    setView('home');
    window.history.pushState({}, '', '/');
  };

  const onCopyLink = async () => {
    const url = `${window.location.origin}/c/${channel.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy invite link:', url);
    }
  };

  if (view === 'room' && channel) {
    return (
      <div className="app-shell">
        <Room
          channel={channel}
          userId={userId}
          displayName={displayName}
          isAdmin={isAdmin}
          members={members}
          messages={messages}
          playback={playback}
          onSendChat={onSendChat}
          onPlaybackUpdate={onPlaybackUpdate}
          onLeave={onLeave}
          onCopyLink={onCopyLink}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="home">
        <div className="home-card">
          <h1 className="brand">SyncWave</h1>
          <p className="tagline">
            Create a channel, share the link, chat and listen to YouTube together — no signup.
          </p>

          {!connected && <p className="hint">Connecting…</p>}
          {view === 'joining' && <p className="hint">Rejoining your channel…</p>}

          <form onSubmit={createChannel}>
            <div className="field">
              <label htmlFor="displayName">Your name</label>
              <input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="channelName">Channel name</label>
              <input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Friday night beats"
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy || !connected}>
              Create channel
            </button>
          </form>

          <div className="divider">or join</div>

          <form onSubmit={joinChannel}>
            <div className="field">
              <label htmlFor="joinCode">Invite link or code</label>
              <input
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="https://…/c/abc123 or abc123"
                required
              />
            </div>
            <button className="btn btn-ghost" type="submit" disabled={busy || !connected} style={{ width: '100%' }}>
              Join channel
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
