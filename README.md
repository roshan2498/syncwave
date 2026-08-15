# SyncWave

Create a channel, share a unique link, chat, and listen to YouTube music in sync. No signup — identity and host rights live in your browser (`localStorage`).

## Features

- Create a channel → get `/c/<code>` invite link
- Join via link or code (rejoin restores host if this browser created the channel)
- Real-time chat
- Host controls playback for everyone (play / pause / seek / track change)
- Search YouTube (needs `YOUTUBE_API_KEY`) or paste any YouTube URL

## Local development

```bash
cd syncwave
cp .env.example server/.env   # optional: add YOUTUBE_API_KEY
npm run install:all
npm run dev
```

- App UI: http://localhost:5173  
- API / sockets: http://localhost:3001  

## Production (single server)

```bash
npm run install:all
npm run build
YOUTUBE_API_KEY=your_key npm start
```

Serves the built client and Socket.IO from one port (`PORT`, default `3001`).

## Free deploy on Render

1. Push this folder to a GitHub repo.
2. Go to [render.com](https://render.com) → **New** → **Blueprint** (or Web Service) and connect the repo.
3. Or manually:
   - **Build:** `npm run install:all && npm run build`
   - **Start:** `npm start`
   - **Health check:** `/health`
4. Optional: set `YOUTUBE_API_KEY` in Render env (Google Cloud → enable YouTube Data API v3 → create API key).
5. Open the Render URL, create a channel, share the invite link.

Free tier may sleep after idle; first load can take ~30–60s.

### YouTube API key (optional)

Without a key, search is disabled — hosts can still paste YouTube links/URLs to play.

1. [Google Cloud Console](https://console.cloud.google.com/) → create a project  
2. Enable **YouTube Data API v3**  
3. Credentials → API key → set as `YOUTUBE_API_KEY`

## How host / session works

| Stored in browser | Purpose |
|-------------------|---------|
| `userId` | Stable guest identity for rejoin |
| `displayName` | Your name |
| `adminToken` per channel | Proves you created the channel (host controls) |

Clearing site data removes host rights on that device; the channel still works for others via the link.
