import { useEffect, useRef, useState } from 'react';
import Player from './Player.jsx';
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

  return (
    <div className="room">
      <header className="room-top">
        <div>
          <h1 className="room-title">{channel.name}</h1>
          <div className="room-meta">
            {isAdmin && <span className="badge">Host</span>}{' '}
            {members.length} listening · you are {displayName}
          </div>
        </div>
        <div className="room-actions">
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              onCopyLink();
              showToast('Invite link copied');
            }}
          >
            Copy invite link
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={onLeave}>
            Leave
          </button>
        </div>
      </header>

      <div className="room-body">
        <section className="panel player-wrap">
          <Player
            playback={playback}
            isAdmin={isAdmin}
            onAdminStateChange={onPlaybackUpdate}
          />
          <p className="now-playing">
            Now playing:{' '}
            <strong>{playback?.title || playback?.videoId || '—'}</strong>
            {!isAdmin && ' · synced to host'}
          </p>

          {isAdmin ? (
            <>
              <form className="search-box" onSubmit={handleSearch}>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search music or paste a YouTube URL"
                />
                <button className="btn btn-primary" type="submit" disabled={searching} style={{ width: 'auto' }}>
                  {searching ? '…' : 'Go'}
                </button>
              </form>
              <p className="hint">
                Tip: paste any YouTube link if search is unavailable. Only you (host) control playback.
              </p>
              {searchError && <p className="error">{searchError}</p>}
              {results.length > 0 && (
                <div className="results">
                  {results.map((item) => (
                    <button
                      key={item.videoId}
                      type="button"
                      className="result-item"
                      onClick={() => playResult(item)}
                    >
                      {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <div />}
                      <div className="meta">
                        <p>{item.title}</p>
                        <span>{item.channelTitle}</span>
                      </div>
                      <span className="badge">Play</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="controls">
                <button
                  type="button"
                  className="btn btn-ghost btn-small"
                  disabled={!playback?.videoId}
                  onClick={() =>
                    onPlaybackUpdate({
                      ...playback,
                      isPlaying: !playback?.isPlaying,
                    })
                  }
                >
                  {playback?.isPlaying ? 'Pause for everyone' : 'Play for everyone'}
                </button>
              </div>
            </>
          ) : (
            <p className="hint">The host chooses and controls the music. Chat while you listen.</p>
          )}
        </section>

        <aside className="panel side">
          <div className="members">
            {members.map((m) => (
              <span key={m.userId} className={`member-chip ${m.isAdmin ? 'admin' : ''}`}>
                {m.displayName}
                {m.isAdmin ? ' · host' : ''}
                {m.userId === userId ? ' (you)' : ''}
              </span>
            ))}
          </div>

          <div className="chat">
            {messages.map((m) =>
              m.userId === 'system' ? (
                <div key={m.id} className="msg system">
                  {m.text}
                </div>
              ) : (
                <div key={m.id} className={`msg ${m.userId === userId ? 'mine' : ''}`}>
                  <div className="who">{m.displayName}</div>
                  <div className="bubble">{m.text}</div>
                </div>
              )
            )}
            <div ref={chatEndRef} />
          </div>

          <form className="chat-form" onSubmit={sendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
            />
            <button className="btn btn-primary" type="submit" style={{ width: 'auto' }}>
              Send
            </button>
          </form>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
