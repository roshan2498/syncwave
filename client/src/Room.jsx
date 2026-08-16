import { useEffect, useRef, useState } from 'react';
import Player from './Player.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { extractVideoId } from './session.js';

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

  const line = 'border-ink/10 dark:border-white/10';
  const softBtn =
    'border border-ink/15 px-3 py-1.5 text-sm font-medium text-mute transition hover:border-signal hover:text-signal dark:border-white/15 dark:text-mist';
  const field =
    'min-w-0 flex-1 border border-ink/10 bg-mist/40 px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-mute/50 focus:border-signal/60 dark:border-white/10 dark:bg-panel-2 dark:text-paper dark:placeholder:text-mist/40';

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink dark:bg-panel dark:text-paper">
      <header
        className={`sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b ${line} bg-paper/90 px-4 py-3 backdrop-blur-md dark:bg-panel/90 sm:px-6`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tracking-tight text-signal-ink dark:text-signal">
              SyncWave
            </span>
            <span className="text-mute/40 dark:text-white/25">/</span>
            <h1 className="truncate font-display text-lg font-bold tracking-tight sm:text-xl">
              {channel.name}
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-mute dark:text-mist/70">
            {isAdmin && (
              <span className="mr-2 inline-block bg-signal px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-signal-ink">
                Host
              </span>
            )}
            {members.length} listening · {displayName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemeToggle className={softBtn + ' !px-0'} />
          <button
            type="button"
            className={softBtn}
            onClick={() => {
              onCopyLink();
              showToast('Invite link copied');
            }}
          >
            Copy invite
          </button>
          <button
            type="button"
            className={`${softBtn} hover:border-live hover:text-live`}
            onClick={onLeave}
          >
            Leave
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
        <section className={`flex flex-col gap-4 border-b ${line} p-4 sm:p-6 lg:border-b-0 lg:border-r`}>
          <Player playback={playback} isAdmin={isAdmin} onAdminStateChange={onPlaybackUpdate} />

          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-mute/60 dark:text-mist/50">
                Now playing
              </p>
              <p className="truncate font-display text-lg font-semibold">
                {playback?.title || playback?.videoId || '—'}
              </p>
              {!isAdmin && <p className="text-xs text-mute/60 dark:text-mist/50">Synced to host</p>}
            </div>
            {isAdmin && (
              <button
                type="button"
                disabled={!playback?.videoId}
                className="bg-signal px-4 py-2 text-sm font-bold text-signal-ink transition hover:brightness-110 disabled:opacity-40"
                onClick={() =>
                  onPlaybackUpdate({
                    ...playback,
                    isPlaying: !playback?.isPlaying,
                  })
                }
              >
                {playback?.isPlaying ? 'Pause all' : 'Play all'}
              </button>
            )}
          </div>

          {isAdmin ? (
            <div className="space-y-3">
              <form className="flex gap-2" onSubmit={handleSearch}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search music or paste a YouTube URL"
                  className={field}
                />
                <button
                  type="submit"
                  disabled={searching}
                  className="bg-ink px-4 py-2.5 text-sm font-bold text-signal transition hover:opacity-90 disabled:opacity-50 dark:bg-paper dark:text-ink dark:hover:bg-signal"
                >
                  {searching ? '…' : 'Go'}
                </button>
              </form>
              <p className="text-xs text-mute/55 dark:text-mist/45">
                Paste any YouTube link if search is unavailable. Only you control playback.
              </p>
              {searchError && <p className="text-sm text-live">{searchError}</p>}
              {results.length > 0 && (
                <div className="max-h-56 space-y-1 overflow-auto">
                  {results.map((item) => (
                    <button
                      key={item.videoId}
                      type="button"
                      onClick={() => playResult(item)}
                      className="grid w-full grid-cols-[72px_1fr_auto] items-center gap-3 border border-transparent p-1.5 text-left transition hover:border-signal/40 hover:bg-mist/50 dark:hover:bg-panel-2"
                    >
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" className="h-10 w-[72px] object-cover" />
                      ) : (
                        <div className="h-10 w-[72px] bg-mist dark:bg-panel-2" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-mute/60 dark:text-mist/50">{item.channelTitle}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-signal-ink dark:text-signal">
                        Play
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-mute/60 dark:text-mist/50">Host picks the music. Chat while you listen.</p>
          )}
        </section>

        <aside className="flex max-h-[min(100vh,720px)] min-h-[380px] flex-col lg:max-h-[calc(100vh-57px)]">
          <div className={`flex flex-wrap gap-1.5 border-b ${line} px-4 py-3`}>
            {members.map((m) => (
              <span
                key={m.userId}
                className={`px-2 py-0.5 text-xs ${
                  m.isAdmin
                    ? 'bg-signal/25 font-semibold text-signal-ink dark:bg-signal/15 dark:text-signal'
                    : 'bg-ink/5 text-mute dark:bg-white/5 dark:text-mist/70'
                }`}
              >
                {m.displayName}
                {m.isAdmin ? ' · host' : ''}
                {m.userId === userId ? ' (you)' : ''}
              </span>
            ))}
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-auto px-4 py-4">
            {messages.map((m) =>
              m.userId === 'system' ? (
                <p key={m.id} className="self-center text-center text-xs italic text-mute/45 dark:text-mist/40">
                  {m.text}
                </p>
              ) : (
                <div
                  key={m.id}
                  className={`max-w-[92%] ${m.userId === userId ? 'self-end text-right' : 'self-start'}`}
                >
                  <p
                    className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      m.userId === userId
                        ? 'text-signal-ink dark:text-signal'
                        : 'text-mute/70 dark:text-mist/55'
                    }`}
                  >
                    {m.displayName}
                  </p>
                  <div
                    className={`inline-block px-3 py-2 text-sm leading-snug ${
                      m.userId === userId
                        ? 'bg-signal/30 text-ink dark:bg-signal/15 dark:text-paper'
                        : 'bg-mist/70 text-ink dark:bg-panel-2 dark:text-paper/90'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              )
            )}
            <div ref={chatEndRef} />
          </div>

          <form className={`flex gap-2 border-t ${line} p-3`} onSubmit={sendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
              className={field}
            />
            <button
              type="submit"
              className="bg-signal px-4 py-2.5 text-sm font-bold text-signal-ink transition hover:brightness-110"
            >
              Send
            </button>
          </form>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-up border border-ink/10 bg-paper px-4 py-2 text-sm text-ink shadow-lg dark:border-white/10 dark:bg-panel-2 dark:text-paper">
          {toast}
        </div>
      )}
    </div>
  );
}
