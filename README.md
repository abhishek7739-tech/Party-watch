# Watchwave

A real-time YouTube watch party built with React, Socket.IO, and an authoritative Node/Express room server.

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173` in two browser windows to test multi-user sync. Production build and server:

```powershell
npm.cmd run build
$env:PORT=3001; npm.cmd start
```

## Features

- Host-created six-character private rooms, with a 10-user room limit.
- Synced YouTube video changes, play, pause, seek and late-join playback state.
- Four roles: host, moderator, participant and viewer. Hosts can promote/demote members; hosts and moderators control playback.
- Live in-room chat with server-side length limits and basic input sanitization.
- Responsive UI, health endpoint (`/health`), runtime configuration through `PORT` and `CLIENT_ORIGIN`.

## Server structure

```text
server/
├── index.js                    # Starts HTTP, Express, and Socket.IO
├── app.js                      # Express middleware, API routes, React build
├── config/                     # Environment and Socket.IO configuration
├── routes/health.routes.js      # HTTP health-check route
├── controllers/                # Playback, chat, and member actions
├── services/room.service.js    # Room state and business rules
├── socket/                     # Socket event registration and room helpers
├── constants/roles.js          # Role names and permissions
└── utils/text.js               # Shared sanitizing helper
```

Socket events are registered in `server/socket/registerSocketHandlers.js`. Each event delegates to a controller; controllers use `room.service.js` to read or update room data. This keeps transport code separate from application logic.

## Production notes

Rooms are intentionally held in memory for this assignment. For horizontally scaled deployment, replace the `rooms` map with Redis/database persistence and configure Socket.IO's Redis adapter; terminate TLS at the edge, set an explicit `CLIENT_ORIGIN`, apply rate limiting/authentication, and add automated integration tests and observability.
