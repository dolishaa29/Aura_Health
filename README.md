## Aurahealth

Monorepo for the Aurahealth full-stack web application.

### Backend (`backend`)

- **Stack**: Node.js, Express.js, MongoDB (Mongoose), Socket.io, JWT, bcrypt, WebRTC signaling, Google Gemini
- **Key features**:
  - JWT auth (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`)
  - Roles: doctor, patient, admin (RBAC)
  - Appointments (`/api/appointments`)
  - Reports, skin analysis, emergency guidance (Gemini)
  - Socket.io: online status, private chat, WebRTC signaling

**Run backend:**

```bash
cd backend
cp .env.example .env   # adjust values
npm install
npm run dev
```

### Frontend (`frontend`)

- **Stack**: React (Vite), React Router, Context API, Tailwind CSS, Socket.io-client, WebRTC
- **Key features**:
  - Auth (`/login`, `/register`), role landing (`/`), dashboards, video call (`/video/:roomId`)

**Run frontend:**

```bash
cd frontend
cp .env.example .env   # optional, adjust if backend URL changes
npm install
npm run dev
```

By default the backend runs on `http://localhost:5000` and frontend on `http://localhost:5173`. Update `CLIENT_ORIGIN` (backend) and `VITE_API_BASE` / `VITE_SOCKET_URL` (frontend) if you change ports or deploy.
