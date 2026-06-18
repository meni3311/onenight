/* ============================================================
   Mock API — localStorage-backed, mimics the future REST backend.
   Lets the frontend run standalone (npm run dev) with no server.

   To switch to a real backend later, replace `api()` below with a
   fetch() implementation pointing at your server. The endpoint
   shapes (paths, bodies, responses) match what the UI expects.
   ============================================================ */
import { SEED, LS, ADMIN_PASSWORD } from "./data.js";

const DELAY = 250; // simulate network latency
const wait = (v) => new Promise((res) => setTimeout(() => res(v), DELAY));

const DRESSES_KEY = "onenight_dresses";
const USERS_KEY = "onenight_users";

function loadDresses(){
  let list = LS.get(DRESSES_KEY, null);
  if(!list){ list = SEED; LS.set(DRESSES_KEY, list); }
  return list;
}
function saveDresses(list){ LS.set(DRESSES_KEY, list); }
function loadUsers(){ return LS.get(USERS_KEY, []); }
function saveUsers(list){ LS.set(USERS_KEY, list); }

function uid(prefix){ return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

class ApiError extends Error {}

/* Router: (method, path, {body, adminPw}) -> data */
function route(method, path, { body, adminPw } = {}){
  const [bare, query] = path.split("?");
  const parts = bare.split("/").filter(Boolean); // e.g. ["api","dresses","seed-1","status"]

  // ---- dresses collection ----
  if(parts[0] === "api" && parts[1] === "dresses" && parts.length === 2){
    if(method === "GET"){
      const params = new URLSearchParams(query || "");
      const status = params.get("status") || "approved";
      const all = loadDresses();
      return status === "all" ? all : all.filter(d => d.status === status);
    }
    if(method === "POST"){
      const list = loadDresses();
      const created = {
        id: uid("dress"),
        status: "pending",
        createdAt: Date.now(),
        booked: [],
        ...body,
      };
      const next = [created, ...list];
      saveDresses(next);
      return created;
    }
  }

  // ---- single dress + sub-routes ----
  if(parts[0] === "api" && parts[1] === "dresses" && parts.length >= 3){
    const id = parts[2];
    const list = loadDresses();
    const idx = list.findIndex(d => d.id === id);
    if(idx === -1) throw new ApiError("השמלה לא נמצאה");
    const dress = list[idx];

    // PATCH /api/dresses/:id  (edit fields)
    if(parts.length === 3 && method === "PATCH"){
      const updated = { ...dress, ...body };
      const next = [...list]; next[idx] = updated; saveDresses(next);
      return updated;
    }
    // PATCH /api/dresses/:id/booked  (toggle a date)
    if(parts[3] === "booked" && method === "PATCH"){
      const key = body.key;
      const booked = dress.booked.includes(key)
        ? dress.booked.filter(x => x !== key)
        : [...dress.booked, key];
      const updated = { ...dress, booked };
      const next = [...list]; next[idx] = updated; saveDresses(next);
      return updated;
    }
    // PATCH /api/dresses/:id/status  (admin approve/reject)
    if(parts[3] === "status" && method === "PATCH"){
      if(adminPw !== ADMIN_PASSWORD) throw new ApiError("אין הרשאה");
      const updated = { ...dress, status: body.status, rejectReason: body.rejectReason || "" };
      const next = [...list]; next[idx] = updated; saveDresses(next);
      return updated;
    }
  }

  // ---- auth ----
  if(bare === "/api/auth/register" && method === "POST"){
    const users = loadUsers();
    if(users.some(u => u.phone === body.phone)) throw new ApiError("מספר הטלפון כבר רשום");
    const user = { id: uid("user"), name: body.name, email: body.email, city: body.city, phone: body.phone, password: body.password };
    saveUsers([...users, user]);
    const { password, ...safe } = user;
    return safe;
  }
  if(bare === "/api/auth/login" && method === "POST"){
    const users = loadUsers();
    const user = users.find(u => u.phone === body.phone && u.password === body.password);
    if(!user) throw new ApiError("טלפון או סיסמה שגויים");
    const { password, ...safe } = user;
    return safe;
  }
  if(bare === "/api/admin/login" && method === "POST"){
    return { ok: body.password === ADMIN_PASSWORD };
  }

  throw new ApiError("נתיב לא קיים: " + method + " " + path);
}

export async function api(path, { method = "GET", body, adminPw } = {}){
  try{
    const data = route(method, path, { body, adminPw });
    return await wait(data);
  }catch(e){
    await wait(null);
    throw e;
  }
}
