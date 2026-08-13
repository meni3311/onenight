# onenight — השכרת שמלות ערב

Marketplace for renting evening dresses (Hebrew, RTL). A NestJS + SQLite backend serves a REST API **and** the frontend, so you run **one** command and open one URL.

```
oneNighth/
├─ backend/        NestJS API + SQLite database
│  ├─ src/         source code
│  └─ data/        onenight.sqlite is created here on first run
├─ frontend/
│  └─ index.html   the web app (served by the backend)
├─ index.html      original standalone prototype (localStorage only — kept for reference)
└─ README.md
```

## Requirements

- **Node.js 20 or newer** (includes npm). Check with `node -v`. Download: https://nodejs.org

## Run it

```bash
cd backend
npm install        # first time only — downloads dependencies
npm run start      # compiles and starts the server
```

Then open **http://localhost:3000** in your browser.

The SQLite database (`backend/data/onenight.sqlite`) is created automatically and seeded with 8 sample dresses on first launch. Data persists between restarts. To reset everything, stop the server and delete that file.

For auto-reload while developing: `npm run start:dev`.

## Admin panel

Open **http://localhost:3000/#admin**.
(change it via the `ADMIN_PASSWORD` environment variable, e.g. `ADMIN_PASSWORD=secret npm run start`).

Here you approve or reject pending listings.

## Login demo

Registration asks for an SMS code — for the demo, enter **1234**. The account is then created in the database (password stored hashed with bcrypt). Log back in with the same phone + password.

## API reference

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/dresses` | Browse **approved** dresses — paginated and filtered server-side (`?page=&limit=&sort=&colors=&sizes=&regions=&dressLengths=&sleeveLengths=&minPrice=&maxPrice=&source=&q=`). Returns `{ items, total, page, limit }`, without owner contact details. There is no parameter that reaches a pending or rejected listing |
| GET | `/api/dresses/by-ids` | Approved dresses by id, in the order asked for (`?ids=a,b,c`) — backs the favourites page |
| GET | `/api/dresses/mine` | An owner's own listings at every status (`?email=`) |
| GET | `/api/dresses/:id` | One dress, contact details included |
| GET | `/api/dresses/:id/similar` | Approved dresses sharing this one's colour or source |
| GET | `/api/admin/dresses` | **Admin** moderation queue (`?status=pending\|approved\|rejected\|all`, paginated, with per-status counts; `x-admin-password` header) |
| POST | `/api/dresses` | Publish a dress (lands as `pending`) |
| PATCH | `/api/dresses/:id` | Edit listing fields |
| PATCH | `/api/dresses/:id/booked` | Toggle an availability date (`{ "key": "2026-07-01" }`) |
| PATCH | `/api/dresses/:id/status` | **Admin** approve/reject (`x-admin-password` header) |
| DELETE | `/api/dresses/:id` | **Admin** delete (`x-admin-password` header) |
| POST | `/api/admin/login` | Check admin password |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in (phone + password) |
| POST | `/api/auth/profile` | Update profile |

## Notes / next steps

- Favorites are stored per-browser in `localStorage` (no account needed).
- Email notifications and SMS verification are mocked (logged to the browser console). Wire up a real provider (Resend, Twilio) where marked `TODO`.
- Images are stored inline (base64 / URLs). For production, upload to object storage and keep only the URL.
- The admin gate is a shared password — replace with real auth (JWT/sessions) before going live.
- Listing ownership is an email match (`/api/dresses/mine`, listing deletion), because there is no session to check. Anyone who knows an address can read that person's listings. This is the same reason the admin gate is temporary, and both go away together when real auth lands.
