# 🌍 Earth from Space Live Dashboard — OrbitX

A futuristic full-stack web app with a real-time 3D rotating Earth, ISS tracking, satellite visualization, weather overlays, and a glassmorphism analytics panel.

## 🚀 Tech Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | React 18 + Vite 5 + Three.js (R3F/Drei)  |
| Styling   | Tailwind CSS v3 + Custom CSS              |
| Charts    | Recharts                                  |
| Backend   | Python Flask + Flask-CORS                 |
| Container | Docker + Docker Compose                   |

## ✨ Features

- 🌍 **Realistic 3D Earth** — Day/night custom GLSL shader, city lights, cloud layer
- ☁️ **Cloud Layer** — Transparent animated cloud sphere
- 🌑 **Day/Night Shading** — Sunlight direction shader with smooth terminator
- 🛰️ **ISS Live Tracking** — Real-time position from Open Notify API (5s refresh)
- 🛸 **Orbiting Satellites** — Animated Starlink, WorldView, GPS satellites
- 🌟 **Atmosphere Glow** — Additive-blended atmospheric rim shader
- 📍 **Country Markers** — Clickable markers with pulse animations
- 📍 **Phnom Penh Highlight** — Gold glowing pulse + floating weather card on zoom
- 🎛️ **Analytics Panel** — Glassmorphism sidebar with ISS data, charts, weather, status
- 🌡️ **Temperature Chart** — 24h area chart with Recharts
- ⭐ **Star Field** — 6000 stars with depth and fade

## 🏃 Running Locally

### Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
# → Runs on http://localhost:5000
```

### Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev
# → Runs on http://localhost:5173
```

## 🐳 Docker Deployment
```bash
docker-compose up --build
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
```

## 🎮 Interactions

| Action               | Result                                          |
|----------------------|-------------------------------------------------|
| **Drag**             | Rotate the globe                                |
| **Scroll**           | Zoom in / out                                   |
| **Zoom into Cambodia** | Phnom Penh glows gold with weather card       |
| **Click country marker** | Shows country info + weather in sidebar    |
| **Panel tabs**       | Toggle Overview / Satellite / Weather views     |

## 📡 API Endpoints

| Endpoint                  | Description                      |
|---------------------------|----------------------------------|
| `GET /api/iss-location`   | Live ISS lat/lon/altitude        |
| `GET /api/satellite-data` | Fleet of tracked satellites      |
| `GET /api/weather/:lat/:lon` | Weather for coordinates       |
| `GET /api/country/:id`    | Country metadata                 |
| `GET /api/health`         | Backend health check             |

## 📁 Project Structure

```
OrbitX/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main app + state
│   │   ├── components/
│   │   │   ├── EarthScene.jsx    # Three.js Earth + shaders
│   │   │   ├── AnalyticsPanel.jsx # Right sidebar
│   │   │   └── TopBar.jsx        # Status bar
│   │   ├── index.css             # Global styles
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── Dockerfile
└── docker-compose.yml
```
