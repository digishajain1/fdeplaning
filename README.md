# FDE Planning — Strategic Session Meeting Artifact

A full-stack web application for running FDE (Forward Deployed Expertise) strategic working sessions. Features real-time collaborative commenting, editable commitment tracking, and data export — all persisted to a database.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## ✨ Features

- **Interactive Meeting Artifact** — Visual dashboard with decision matrix, role cards, and commitment tracking
- **Real-time Collaboration** — WebSocket-powered live updates across all connected users
- **Collaborative Comments** — Add comments to any section or table row; persisted across sessions
- **Editable Commitment Matrix** — Click to edit owner/deadline cells; auto-saves to database
- **Export Notes** — Download meeting notes as a `.txt` file
- **Auto-save Indicator** — Visual feedback showing when changes are saved
- **Production Ready** — Docker support, health checks, rate limiting, security headers

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** (or Docker)
- **npm** (comes with Node.js)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start development servers (API + Vite frontend)
npm run dev
```

This runs:
- **Backend API** at `http://localhost:3000`
- **Frontend (Vite)** at `http://localhost:5173` (with API proxy)

Open **http://localhost:5173** in your browser.

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

Server runs at `http://localhost:3000` serving the built frontend.

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at `http://localhost:3000`.

### Using Docker Directly

```bash
# Build image
docker build -t fde-planning .

# Run container
docker run -d \
  --name fdeplanning \
  -p 3000:3000 \
  -v fdeplanning-data:/app/data \
  fde-planning
```

---

## ☁️ Cloud Deployment

### Render.com

1. Push this repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your repository
4. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** `NODE_ENV=production`
5. Add a **Disk** for persistence:
   - Mount path: `/app/data`
   - Size: 1 GB

### Railway.app

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Add a volume for `/app/data` in the Railway dashboard.

### Fly.io

```bash
# Install Fly CLI, then:
fly launch
fly volumes create fdeplanning_data --size 1
fly deploy
```

Update `fly.toml` to mount the volume at `/app/data`.

### Any VPS (DigitalOcean, AWS EC2, etc.)

```bash
# SSH into your server
ssh user@your-server

# Clone and deploy
git clone <your-repo-url> fdeplanning
cd fdeplanning
docker-compose up -d
```

Optionally, put behind **nginx** or **Caddy** for HTTPS.

---

## 📁 Project Structure

```
fdeplanning/
├── index.html          # Main frontend (Vite entry)
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite configuration
├── Dockerfile          # Production Docker image
├── docker-compose.yml  # Docker Compose config
├── server/
│   ├── index.js        # Express server entry
│   ├── db/
│   │   └── init.js     # SQLite database setup
│   └── routes/
│       ├── comments.js     # Comments API
│       └── commitments.js  # Commitments API
├── data/               # SQLite database (auto-created)
└── dist/               # Production build output
```

---

## 🔌 API Reference

### Comments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/comments` | Get all comments grouped by section |
| `GET` | `/api/comments/:sectionId` | Get comments for a specific section |
| `POST` | `/api/comments` | Create a comment (`{ sectionId, text, author }`) |
| `DELETE` | `/api/comments/:id` | Delete a comment |

### Commitments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/commitments` | Get all commitment rows |
| `PUT` | `/api/commitments/:rowKey` | Update owner/deadline (`{ ownerDeadline }`) |
| `GET` | `/api/commitments/export` | Export all data as JSON |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Returns `{ status: 'ok', timestamp }` |

---

## 🛠 Development

### Reset Database

```bash
npm run db:reset
```

This deletes the SQLite database and re-seeds default commitment rows.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Set to `production` for optimized build |

---

## 📋 Meeting Artifact Content

This application is pre-loaded with the **FDE Strategic Working Session** content:

- **Provocation** — Wave 2 vs Wave 1 trend analysis
- **Metric Table** — 11 metrics with Δ comparison
- **Data Grid** — Key insights and scores
- **Participant Voices** — Direct survey feedback
- **Program Team Input** — Tiger Team quotes
- **Session Timeline** — 2.5-hour decision meeting flow
- **5 Decision Blocks** — Pre-work, Structure, Roles, Success Criteria, Wrap-up
- **Commitment Matrix** — Editable owner/deadline tracking

---

## 📄 License

MIT © 2026 Slalom / FDE Program

---

## 🙋 Support

For questions about the meeting artifact content, contact **Digisha Jain**.

For technical issues, open a GitHub Issue.
