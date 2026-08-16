import { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';

export default function Player({
  playback,
  isAdmin,
  onAdminStateChange,
  mutedFollowers = false,
}) {
  const playerRef = useRef(null);
  const applyingRemote = useRef(false);
  const [ready, setReady] = useState(false);
  const lastVideoId = useRef(null);

  const videoId = playback?.videoId || null;

  useEffect(() => {
    if (!ready || !playerRef.current || !playback?.videoId) return;

    const player = playerRef.current;
    const apply = async () => {
      applyingRemote.current = true;
      try {
        const elapsed = playback.isPlaying
          ? (Date.now() - playback.updatedAt) / 1000
          : 0;
        const target = Math.max(0, (playback.currentTime || 0) + elapsed);

        if (lastVideoId.current !== playback.videoId) {
          lastVideoId.current = playback.videoId;
          if (playback.isPlaying) {
            await player.loadVideoById({ videoId: playback.videoId, startSeconds: target });
          } else {
            await player.cueVideoById({ videoId: playback.videoId, startSeconds: target });
          }
        } else {
          const current = player.getCurrentTime?.() || 0;
          if (Math.abs(current - target) > 1.5) {
            player.seekTo(target, true);
          }
          const state = player.getPlayerState?.();
          if (playback.isPlaying && state !== 1) player.playVideo();
          if (!playback.isPlaying && state === 1) player.pauseVideo();
        }
      } catch {
        /* player may not be ready */
      } finally {
        setTimeout(() => {
          applyingRemote.current = false;
        }, 400);
      }
    };

    apply();
  }, [playback, ready]);

  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      playsinline: 1,
      origin: window.location.origin,
    },
  };

  const emitFromAdmin = (partial) => {
    if (!isAdmin || applyingRemote.current || !onAdminStateChange) return;
    const player = playerRef.current;
    const currentTime = player?.getCurrentTime?.() ?? partial.currentTime ?? 0;
    onAdminStateChange({
      videoId,
      title: playback?.title,
      currentTime,
      ...partial,
    });
  };

  if (!videoId) {
    return (
      <div className="player-frame border border-ink/10 bg-ink dark:border-white/10">
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div>
            <p className="font-display text-xl font-bold text-paper sm:text-2xl">Nothing playing yet</p>
            <p className="mt-2 text-sm text-mist/60">
              {isAdmin
                ? 'Search below or paste a YouTube link to start.'
                : 'Waiting for the host to pick a track.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-frame border border-ink/10 bg-ink dark:border-white/10">
      <YouTube
        className="yt-wrap"
        iframeClassName="yt-iframe"
        videoId={videoId}
        opts={opts}
        onReady={(e) => {
          playerRef.current = e.target;
          const iframe = e.target.getIframe?.();
          if (iframe) {
            iframe.setAttribute('allowfullscreen', '1');
            iframe.setAttribute(
              'allow',
              'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen'
            );
          }
          setReady(true);
          if (mutedFollowers && !isAdmin) {
            try {
              e.target.mute();
            } catch {
              /* ignore */
            }
          }
        }}
        onPlay={() => emitFromAdmin({ isPlaying: true })}
        onPause={() => emitFromAdmin({ isPlaying: false })}
        onEnd={() => emitFromAdmin({ isPlaying: false })}
        onStateChange={(e) => {
          if (!isAdmin || applyingRemote.current) return;
          if (e.data === 1 || e.data === 2) {
            emitFromAdmin({ isPlaying: e.data === 1 });
          }
        }}
      />
    </div>
  );
}
