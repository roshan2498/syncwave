import { useEffect, useRef, useState } from 'react';
import Player from './Player.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { extractVideoId } from './session.js';

function initials(name) {
  return String(name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Room({
  channel,
  userId,
  displayName,
  isAdmin,
  members,
  messages,
  playback,
  onSendChat,
  onPlaybackUpdate,
  onLeave,
  onCopyLink,
}) {
  const [chatText, setChatText] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState('');
  const [mobileTab, setMobileTab] = useState('stage'); // stage | chat
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(''), 2200);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    const videoId = extractVideoId(q);
    if (videoId && isAdmin) {
      onPlaybackUpdate({
        videoId,
        title: q,
        isPlaying: true,
        currentTime: 0,
      });
      setQuery('');
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Search failed');
        setResults([]);
      } else {
        setResults(data.results || []);
        if (!(data.results || []).length) {
          setSearchError(data.error || 'No results. Try pasting a YouTube URL.');
        }
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const playResult = (item) => {
    if (!isAdmin) {
      showToast('Only the host can change the track');
      return;
    }
    onPlaybackUpdate({
      videoId: item.videoId,
      title: item.title,
      isPlaying: true,
      currentTime: 0,
    });
    setResults([]);
    setQuery('');
  };

  const sendChat = (e) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText);
    setChatText('');
  };

  const playing = Boolean(playback?.isPlaying && playback?.videoId);

  const stage = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cinema stage */}
      <div className="relative bg-ink">
        <div className="mx-auto w-full max-w-5xl">
          <Player playback={playback} isAdmin={isAdmin} onAdminStateChange={onPlaybackUpdate} />
        </div>
      </div>

      {/* Transport dock — fused under player */}
      <div className="border-b border-ink/10 bg-paper px-4 py-3 dark:border-white/10 dark:bg-panel-2 sm:px-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`h-2 w-2 shrink-0 rounded-full ${
                playing ? 'animate-pulse bg-live' : 'bg-mute/40'
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base font-bold leading-tight sm:text-lg">
                {playback?.title || playback?.videoId || 'Pick something to play'}
              </p>
              <p className="text-xs text-mute dark:text-mist/50">
                {isAdmin ? 'You’re hosting · controls sync for everyone' : 'Synced to host'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                disabled={!playback?.videoId}
                className="shrink-0 bg-signal px-4 py-2 font-display text-sm font-bold text-signal-ink transition hover:brightness-110 disabled:opacity-40"
                onClick={() =>
                  onPlaybackUpdate({
                    ...playback,
                    isPlaying: !playback?.isPlaying,
                  })
                }
              >
                {playback?.isPlaying ? 'Pause' : 'Play'}
              </button>
            )}
          </div>

          {isAdmin && (
            <form className="flex gap-2" onSubmit={handleSearch}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or paste a YouTube URL"
                className="min-w-0 flex-1 border-0 border-b-2 border-ink/15 bg-transparent py-2 text-sm outline-none transition placeholder:text-mute/50 focus:border-signal dark:border-paper/20 dark:focus:border-signal"
              />
              <button
                type="submit"
                disabled={searching}
                className="shrink-0 px-3 py-2 font-display text-sm font-bold text-signal-ink underline decoration-signal decoration-2 underline-offset-4 disabled:opacity-50 dark:text-signal"
              >
                {searching ? '…' : 'Search'}
              </button>
            </form>
          )}

          {searchError && <p className="text-sm text-live">{searchError}</p>}

          {results.length > 0 && (
            <div className="grid max-h-48 gap-1 overflow-auto sm:grid-cols-2">
              {results.map((item) => (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => playResult(item)}
                  className="flex items-center gap-3 p-1.5 text-left transition hover:bg-mist/60 dark:hover:bg-panel"
                >
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="h-11 w-[78px] shrink-0 object-cover" />
                  ) : (
                    <div className="h-11 w-[78px] shrink-0 bg-mist dark:bg-panel" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-mute dark:text-mist/50">{item.channelTitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const chat = (
    <div className="flex h-full min-h-0 flex-col bg-paper dark:bg-panel">
      <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 dark:border-white/10">
        <div>
          <p className="font-display text-sm font-bold">Live chat</p>
          <p className="text-xs text-mute dark:text-mist/50">{members.length} in the room</p>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <span
              key={m.userId}
              title={`${m.displayName}${m.isAdmin ? ' (host)' : ''}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-paper text-[10px] font-bold dark:border-panel ${
                m.isAdmin
                  ? 'bg-signal text-signal-ink'
                  : 'bg-mist text-ink dark:bg-panel-2 dark:text-paper'
              }`}
            >
              {initials(m.displayName)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 overflow-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="m-auto max-w-[14rem] text-center">
            <p className="font-display text-lg font-bold text-mute/70 dark:text-mist/40">Say hi</p>
            <p className="mt-1 text-sm text-mute/60 dark:text-mist/35">
              Chat appears here while you listen together.
            </p>
          </div>
        )}
        {messages.map((m) =>
          m.userId === 'system' ? (
            <p key={m.id} className="self-center text-center text-[11px] text-mute/50 dark:text-mist/35">
              {m.text}
            </p>
          ) : (
            <div
              key={m.id}
              className={`flex max-w-[90%] gap-2 ${m.userId === userId ? 'self-end flex-row-reverse' : 'self-start'}`}
            >
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  m.userId === userId
                    ? 'bg-signal text-signal-ink'
                    : 'bg-mist text-ink dark:bg-panel-2 dark:text-mist'
                }`}
              >
                {initials(m.displayName)}
              </span>
              <div className={m.userId === userId ? 'text-right' : 'text-left'}>
                <p className="mb-0.5 text-[10px] font-semibold text-mute dark:text-mist/55">
                  {m.displayName}
                  {m.userId === userId ? ' · you' : ''}
                </p>
                <p
                  className={`inline-block px-3 py-1.5 text-sm leading-snug ${
                    m.userId === userId
                      ? 'bg-signal/35 text-ink dark:bg-signal/20 dark:text-paper'
                      : 'bg-mist/80 text-ink dark:bg-panel-2 dark:text-paper/90'
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </div>
          )
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-ink/10 p-3 dark:border-white/10"
        onSubmit={sendChat}
      >
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          placeholder="Message the room…"
          maxLength={500}
          className="min-w-0 flex-1 border-0 border-b-2 border-ink/15 bg-transparent py-2 text-sm outline-none transition placeholder:text-mute/50 focus:border-signal dark:border-paper/20"
        />
        <button
          type="submit"
          className="shrink-0 bg-ink px-3 py-2 font-display text-sm font-bold text-signal transition hover:opacity-90 dark:bg-signal dark:text-signal-ink"
        >
          Send
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink dark:bg-panel dark:text-paper">
      <header className="z-20 flex shrink-0 items-center gap-3 border-b border-ink/10 bg-paper/95 px-3 py-2.5 backdrop-blur dark:border-white/10 dark:bg-panel/95 sm:px-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xs font-extrabold tracking-tight text-signal-ink dark:text-signal">
              SyncWave
            </span>
            <h1 className="truncate font-display text-base font-bold sm:text-lg">{channel.name}</h1>
            {isAdmin && (
              <span className="hidden shrink-0 bg-signal px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-signal-ink sm:inline">
                Host
              </span>
            )}
          </div>
          <div className="mt-1 hidden items-center gap-1.5 sm:flex">
            {members.map((m) => (
              <span
                key={m.userId}
                className="inline-flex items-center gap-1 text-[11px] text-mute dark:text-mist/60"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${m.isAdmin ? 'bg-signal' : 'bg-mute/40'}`}
                />
                {m.displayName}
                {m.userId === userId ? ' (you)' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle className="h-8 w-8 border border-ink/15 text-ink hover:border-signal dark:border-white/15 dark:text-paper" />
          <button
            type="button"
            className="hidden border border-ink/15 px-2.5 py-1.5 text-xs font-medium sm:inline hover:border-signal hover:text-signal dark:border-white/15"
            onClick={() => {
              onCopyLink();
              showToast('Invite link copied');
            }}
          >
            Invite
          </button>
          <button
            type="button"
            className="border border-ink/15 px-2.5 py-1.5 text-xs font-medium hover:border-live hover:text-live dark:border-white/15 sm:hidden"
            onClick={() => {
              onCopyLink();
              showToast('Invite link copied');
            }}
          >
            Invite
          </button>
          <button
            type="button"
            className="border border-ink/15 px-2.5 py-1.5 text-xs font-medium hover:border-live hover:text-live dark:border-white/15"
            onClick={onLeave}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Desktop: stage + chat rail */}
      <div className="hidden min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_340px]">
        {stage}
        <aside className="min-h-0 border-l border-ink/10 dark:border-white/10">{chat}</aside>
      </div>

      {/* Mobile: tabbed stage / chat */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="flex border-b border-ink/10 dark:border-white/10">
          {[
            ['stage', 'Stage'],
            ['chat', `Chat${messages.length ? ` · ${messages.filter((m) => m.userId !== 'system').length}` : ''}`],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`flex-1 py-2.5 font-display text-sm font-bold transition ${
                mobileTab === id
                  ? 'border-b-2 border-signal text-ink dark:text-paper'
                  : 'text-mute'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {mobileTab === 'stage' ? stage : <div className="h-full min-h-[60vh]">{chat}</div>}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up bg-ink px-4 py-2 text-sm text-signal shadow-lg dark:bg-signal dark:text-signal-ink">
          {toast}
        </div>
      )}
    </div>
  );
}
