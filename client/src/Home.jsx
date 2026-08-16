import HeroVisual from './HeroVisual.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function Home({
  connected,
  joining,
  displayName,
  setDisplayName,
  channelName,
  setChannelName,
  joinCode,
  setJoinCode,
  busy,
  error,
  onCreate,
  onJoin,
}) {
  const fieldClass =
    'w-full border-b-2 border-ink/15 bg-transparent py-3 text-lg text-ink outline-none transition placeholder:text-mute/50 focus:border-ink dark:border-paper/20 dark:text-paper dark:focus:border-signal';
  const labelClass =
    'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-mute dark:text-mist/60';

  return (
    <div className="min-h-screen bg-paper text-ink dark:bg-panel dark:text-paper">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Full-bleed hero — brand + visual, never overlaps the form */}
        <section className="relative isolate min-h-[42vh] overflow-hidden bg-ink text-paper lg:min-h-screen">
          <HeroVisual />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent lg:bg-gradient-to-r lg:from-ink/90 lg:via-ink/35 lg:to-transparent" />

          <div className="relative z-10 flex h-full min-h-[42vh] flex-col justify-between p-6 sm:p-10 lg:min-h-screen lg:p-12">
            <div className="flex items-start justify-between gap-4">
              <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-signal">
                No signup · share a link
              </p>
              <ThemeToggle className="border-paper/20 text-paper hover:border-signal hover:text-signal lg:hidden" />
            </div>

            <div className="animate-fade-up max-w-xl pb-2">
              <h1 className="font-display text-[clamp(3rem,9vw,5.25rem)] font-extrabold leading-[0.92] tracking-tight">
                SyncWave
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-mist/80 sm:text-lg">
                One channel. Shared YouTube. Chat while you listen — host keeps the queue in sync.
              </p>
            </div>
          </div>
        </section>

        {/* Form column — isolated from hero */}
        <section className="relative flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 lg:py-16">
          <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
            <ThemeToggle className="hidden border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-signal dark:border-paper/20 dark:text-paper dark:hover:border-signal dark:hover:text-signal lg:inline-flex" />
          </div>

          <div className="mx-auto w-full max-w-md animate-fade-up space-y-8 [animation-delay:100ms]">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Start a session</h2>
              <p className="mt-1 text-sm text-mute dark:text-mist/55">Create a channel or jump in with a link.</p>
            </div>

            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label htmlFor="displayName" className={labelClass}>
                  Your name
                </label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex"
                  required
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="channelName" className={labelClass}>
                  Channel name
                </label>
                <input
                  id="channelName"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Friday night beats"
                  className={fieldClass}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !connected}
                className="mt-2 w-full bg-ink px-5 py-3.5 font-display text-base font-bold text-signal transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-signal dark:text-signal-ink"
              >
                Create channel
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-mute dark:text-mist/50">
              <span className="h-px flex-1 bg-ink/10 dark:bg-paper/15" />
              or join
              <span className="h-px flex-1 bg-ink/10 dark:bg-paper/15" />
            </div>

            <form onSubmit={onJoin} className="space-y-4">
              <div>
                <label htmlFor="joinCode" className={labelClass}>
                  Invite link or code
                </label>
                <input
                  id="joinCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="…/c/abc123 or abc123"
                  required
                  className={fieldClass}
                />
              </div>
              <button
                type="submit"
                disabled={busy || !connected}
                className="w-full border-2 border-ink px-5 py-3.5 font-display text-base font-bold text-ink transition hover:bg-ink hover:text-paper active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 dark:border-paper dark:text-paper dark:hover:bg-paper dark:hover:text-ink"
              >
                Join channel
              </button>
            </form>

            {!connected && <p className="text-sm text-mute dark:text-mist/55">Connecting…</p>}
            {joining && <p className="text-sm text-mute dark:text-mist/55">Rejoining your channel…</p>}
            {error && <p className="text-sm font-medium text-live">{error}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
