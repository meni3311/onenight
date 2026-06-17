# onenight — frontend

Hebrew (RTL) marketplace for renting evening dresses. Built with React + Vite.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build      # output in dist/
npm run preview    # preview the production build
```

## Notes

- The app runs **standalone** — no backend needed. All data (dresses, users,
  favorites) is persisted in the browser's `localStorage` via a mock API in
  `src/api.js`. The mock mimics a REST backend, so swapping in a real server
  later means replacing only `src/api.js`.
- Seed dresses load on first run. To reset data, clear the site's localStorage.

## Demo logins

- **Register**: any details; SMS verification code is `1234`.
- **Admin panel**: open `/#admin`, password `onenight2026` (approve/reject listings).

## Structure

```
src/
  main.jsx        entry point
  App.jsx         root, routing, state
  api.js          localStorage-backed mock API
  data.js         constants + seed dresses + helpers
  components.jsx  Logo, DressCard, Filters, Calendar, DetailModal, ...
  pages.jsx       Publish, ThankYou, Auth, Account, Admin
  styles.css      global styles (rose/gold theme, RTL)
```
