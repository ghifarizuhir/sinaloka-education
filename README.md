# Sinaloka Education

Sistem manajemen bimbingan belajar multi-tenant untuk mengelola siswa, tutor, jadwal, absensi, keuangan, komunikasi, dan lainnya.

## Production

| Service | URL |
|---------|-----|
| API (Backend) | https://api.sinaloka.com |
| Platform (Admin Dashboard) | https://platform.sinaloka.com |
| Tutors (Portal Tutor) | https://tutors.sinaloka.com |
| Parent (Portal Orang Tua) | https://parent.sinaloka.com |

## Apps

| App | Description | Tech | Dev Port |
|-----|-------------|------|----------|
| **sinaloka-backend** | REST API server | NestJS, Prisma, PostgreSQL | 5000 |
| **sinaloka-platform** | Admin dashboard | React, Vite, TailwindCSS v4 | 3000 |
| **sinaloka-tutors** | Portal tutor | React, Vite, TailwindCSS v4 | 5173 |
| **sinaloka-parent** | Portal orang tua (mobile-first) | React, Vite, TailwindCSS v4 | 5174 |
| **sinaloka-landing** | Landing page / marketing site | React, Vite, TailwindCSS v4 | 4000 |

## Features

### Platform (Admin Dashboard)
- **Manajemen Siswa** — CRUD, import/export CSV, undang orang tua, batas paket otomatis
- **Manajemen Tutor** — CRUD, undang via email, upload foto dengan crop, verifikasi massal
- **Kelas & Jadwal** — Buat kelas dengan jadwal, generate sesi otomatis, tampilan timetable mingguan, deteksi jadwal bentrok
- **Enrollment** — Daftarkan siswa ke kelas, deteksi duplikat & kelas penuh, auto-generate invoice
- **Absensi** — Mark kehadiran per siswa (Hadir/Absen/Terlambat), keyboard shortcuts, ringkasan bulanan
- **Keuangan** — Pembayaran siswa, gaji tutor (hitung otomatis), pengeluaran operasional, ringkasan laba rugi, grafik & breakdown
- **WhatsApp** — Kirim pengingat pembayaran, auto-reminder, kelola template pesan
- **Notifikasi Real-time** — SSE push notifications, deep links, mark as read
- **Pendaftaran Online** — Link pendaftaran publik, approve/reject pendaftar
- **Audit Log** — Riwayat semua aktivitas dengan detail perubahan (diff view)
- **Dashboard** — Ringkasan data, grafik tren, activity feed, command palette (Ctrl+K)
- **Multi-bahasa** — Indonesia & English
- **Dark Mode** — Tema gelap/terang yang persisten

### Tutor Portal
- Login & profil tutor
- Lihat jadwal & sesi yang diajar
- Request reschedule sesi
- Lihat slip gaji

### Parent Portal
- Login via undangan dari admin
- Pantau kehadiran anak
- Lihat jadwal sesi anak
- Lihat & bayar tagihan
- Riwayat pembayaran

### Super Admin
- Kelola semua institusi, pengguna, dan langganan
- Override paket & subscription
- Approve/reject upgrade request & pembayaran
- Impersonate institusi (masuk sebagai admin institusi)
- Kelola settlement

## Tech Stack

- **Backend**: NestJS, Prisma ORM, PostgreSQL, Zod validation
- **Frontend**: React 19, Vite, TailwindCSS v4, TanStack Query, Recharts
- **Auth**: JWT access + refresh tokens, role-based access (SUPER_ADMIN, ADMIN, TUTOR, PARENT)
- **Architecture**: Multi-tenant — setiap request di-scope ke institusi via JWT
- **Real-time**: Server-Sent Events (SSE) untuk notifikasi
- **Messaging**: WhatsApp via Fonnte API
- **Email**: Resend API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm

### Backend

```bash
cd sinaloka-backend
npm install
cp .env.example .env        # configure DATABASE_URL, JWT_SECRET, etc.
npx prisma migrate dev      # run database migrations
npx prisma db seed           # seed initial data
npm run start:dev            # start dev server on port 5000
```

### Frontend Apps

```bash
# Admin Platform
cd sinaloka-platform
npm install
npm run dev                  # http://localhost:3000

# Tutor App
cd sinaloka-tutors
npm install
npm run dev                  # http://localhost:5173

# Parent App
cd sinaloka-parent
npm install
npm run dev                  # http://localhost:5174

# Landing Page
cd sinaloka-landing
npm install
npm run dev                  # http://localhost:4000
```

### Environment Variables

Backend (`.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRY` | Access token expiry (e.g. `15m`) |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry (e.g. `7d`) |
| `PORT` | Server port (`5000`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `UPLOAD_DIR` | Upload directory (`./uploads`) |
| `UPLOAD_MAX_SIZE` | Max upload size in bytes (`5242880`) |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address |
| `TUTOR_PORTAL_URL` | Tutor app URL for email links |
| `PARENT_PORTAL_URL` | Parent app URL for email links |
| `FONNTE_TOKEN` | Fonnte WhatsApp token (optional) |
| `FONNTE_DEVICE_NUMBER` | WhatsApp phone number (optional) |

Frontend (`.env`):

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL (e.g. `http://localhost:5000/api`) |

## Project Structure

```
sinaloka/
├── sinaloka-backend/        # NestJS API
│   ├── src/modules/         # Domain modules (student, session, billing, etc.)
│   ├── src/common/          # Guards, interceptors, decorators
│   └── prisma/              # Schema & migrations
├── sinaloka-platform/       # Admin dashboard
├── sinaloka-tutors/         # Tutor portal
├── sinaloka-parent/         # Parent portal
└── sinaloka-landing/        # Landing page
```

## Deployment

| Service | Platform | Auto-deploy |
|---------|----------|-------------|
| Backend | Railway (Docker) | Push to master |
| Frontend apps | Cloudflare Pages | Push to master (GitHub Actions) |
| Database | Railway (PostgreSQL) | N/A |

CI pipeline runs automatically on every PR: lint, type-check, unit tests, build, and security audit per app.

## License

Private — All rights reserved.
