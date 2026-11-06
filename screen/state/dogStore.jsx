import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { ACCESSORIES, INITIAL_STAR_BALANCE, SLOTS } from '../data/accessories.js';
import { DEFAULT_SKIN } from '../data/skins.js';

/**
 * Store of the dog's wallet and wardrobe. No real Telegram Stars payments.
 *
 * Saved in two places, so it survives closing the sheet and reloading the page:
 *   - the page's own database (artifact `db` capability), in the viewer's private record
 *     data/users/<id>/dog-shop — the durable copy, used when the page runs in claude.ai;
 *   - the browser (localStorage) — an instant local copy, and the only one elsewhere.
 * On load the page shows the local copy at once, then takes the database copy when it arrives.
 *
 *   balance — stars left
 *   owned   — ids of bought accessories (free ones, like the Christmas hat, are owned anyway)
 *   worn    — { head, eyes, mouth, skin }: the bought item worn in each slot (id or null);
 *             the 'skin' slot holds a bought skin — none means the default Original Dog
 *
 * The same logic works for every accessory: `buy(item)` charges `item.price` once (an owned
 * accessory is never charged again); `buyMany(items)` buys a whole selection for its total; `wear(slot, id | null)` saves what is worn in a slot — the
 * Dog sheet calls it on Apply Style. Add `?reset` to the page URL to start over.
 */

const STORAGE_KEY = 'telegram-mascot.dog-store.v1';
const emptyWorn = () => Object.fromEntries(SLOTS.map(s => [s, null]));
const INITIAL = { balance: INITIAL_STAR_BALANCE, owned: [], worn: emptyWorn() };
const byId = id => ACCESSORIES.find(item => item.id === id);
// owned: bought, or free for everyone (the Christmas hat)
const owns = (owned, id) => owned.includes(id) || Boolean((byId(id) || {}).free);

// A skin is a whole model of the dog: it is never worn together with accessories (head, eyes, mouth).
// `winner` — the slot just put on: a skin takes the accessories off, an accessory takes the skin off.
const ACCESSORY_SLOTS = ['head', 'eyes', 'mouth'];
function withoutConflicts(worn, winner) {
  if (!winner) return worn;
  const next = { ...worn };
  if (winner === 'skin') { if (next.skin) for (const slot of ACCESSORY_SLOTS) next[slot] = null; }
  else if (next[winner]) next.skin = null;
  return next;
}

// A saved state (from the browser or the database) → a valid state, or null.
function normalize(saved) {
  if (!saved || typeof saved.balance !== 'number' || !Array.isArray(saved.owned)) return null;
  const owned = saved.owned.filter((id, i, all) => byId(id) && all.indexOf(id) === i);
  const worn = emptyWorn();
  // earlier saves kept one id ("christmas-hat"); now one per slot
  const ids = typeof saved.worn === 'string' ? [saved.worn] : Object.values(saved.worn || {});
  for (const id of ids) { const item = byId(id); if (item && owns(owned, id)) worn[item.slot] = id; }
  return { balance: saved.balance, owned, worn: withoutConflicts(worn, worn.skin ? 'skin' : null) };
}

// Set by Restart (and by ?reset): the next store starts from INITIAL and overwrites the database copy.
let startFresh = false;

function load() {
  try {
    const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    if (params && params.has('reset')) {
      startFresh = true;
      localStorage.removeItem(STORAGE_KEY);
      const stars = Number(params.get('stars'));                    // ?reset&stars=5000 — test balance
      return stars > 0 ? { ...INITIAL, balance: stars } : INITIAL;
    }
    return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')) || INITIAL;
  } catch {
    return INITIAL;
  }
}

// ---- the database copy (claude.ai artifact `db`, viewer's private record) ----
const REMOTE_DOC = 'dog-shop';
let remoteRef = null;          // resolved once per page load
let remoteRefPromise = null;
function getRemoteRef() {
  if (!remoteRefPromise) {
    remoteRefPromise = (async () => {
      try {
        const claude = typeof window !== 'undefined' ? window.claude : null;
        if (!claude || typeof claude.use !== 'function') return null;
        const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
        const id = user ? await user.id() : null;
        if (!db || !id) return null;
        remoteRef = db.doc(`data/users/${id}/${REMOTE_DOC}`);
        return remoteRef;
      } catch { return null; }
    })();
  }
  return remoteRefPromise;
}
// One write at a time; the latest state wins.
let writing = false, pending = null;
async function writeRemote(state) {
  pending = state;
  if (writing) return;
  writing = true;
  try {
    const ref = await getRemoteRef();
    while (ref && pending) {
      const next = pending; pending = null;
      try { await ref.set({ balance: next.balance, owned: next.owned, worn: next.worn, savedAt: Date.now() }); }
      catch (e) { if (e && e.code === 'unavailable') { pending = pending || next; await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); } else break; }
    }
  } finally { writing = false; pending = null; }
}

/** Restart: forget the saved shop state (balance, purchases, worn items) in the browser and in the
 *  database. The next store starts fresh (and writes the fresh state to the database). */
export function clearDogStore() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  startFresh = true;
  writeRemote(INITIAL);
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

const round2 = v => Math.round(v * 100) / 100;

function reducer(state, action) {
  switch (action.type) {
    case 'buy': {
      // buying only charges and adds the item to what the user owns; it is put on (saved as worn)
      // by Apply Style, not by the purchase itself
      const { id, price } = action.item;
      if (owns(state.owned, id)) return state;                            // already owned: nothing to pay
      if (!(price > 0) || state.balance < price) return state;            // not enough stars
      return { ...state, balance: round2(state.balance - price), owned: [...state.owned, id] };
    }
    case 'buyMany': {
      // several items at once: charge their total once (each item once, owned ones skipped)
      const items = action.items.filter((item, i, all) => !owns(state.owned, item.id) && all.findIndex(x => x.id === item.id) === i);
      const total = round2(items.reduce((sum, item) => sum + (item.price > 0 ? item.price : 0), 0));
      if (!items.length || state.balance < total) return state;          // not enough stars: nothing
      return { ...state, balance: round2(state.balance - total), owned: [...state.owned, ...items.map(i => i.id)] };
    }
    case 'wear': {
      const { slot, id } = action;
      if (!(slot in state.worn)) return state;
      if (id !== null && (!owns(state.owned, id) || byId(id).slot !== slot)) return state;
      if (state.worn[slot] === id) return state;
      return { ...state, worn: withoutConflicts({ ...state.worn, [slot]: id }, id ? slot : null) };
    }
    case 'hydrate':
      return action.state;
    default:
      return state;
  }
}

const DogStoreContext = createContext(null);

export function DogStoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const ready = useRef(false);      // the database copy has been read (or is unavailable)
  const touched = useRef(false);    // the user changed something before it arrived

  // Take the database copy once: it is the durable one. A fresh start (Restart) overwrites it instead.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ref = await getRemoteRef();
      if (!alive) return;
      if (!ref) { ready.current = true; return; }
      if (startFresh) { startFresh = false; ready.current = true; writeRemote(state); return; }
      let saved = null;
      try { const snap = await ref.get(); saved = snap.exists ? normalize(snap.data()) : null; } catch { saved = null; }
      if (!alive) return;
      ready.current = true;
      if (saved && !touched.current) dispatch({ type: 'hydrate', state: saved });
      else writeRemote(state);       // nothing saved yet, or newer changes made meanwhile
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save every change: browser at once, database once its copy has been read.
  const first = useRef(true);
  useEffect(() => {
    save(state);
    if (first.current) { first.current = false; return; }
    if (ready.current) writeRemote(state); else touched.current = true;
  }, [state]);

  const buy = useCallback(item => dispatch({ type: 'buy', item }), []);
  const buyMany = useCallback(items => dispatch({ type: 'buyMany', items }), []);
  const wear = useCallback((slot, id) => dispatch({ type: 'wear', slot, id }), []);
  const value = useMemo(() => ({
    ...state,
    isOwned: id => owns(state.owned, id),
    canAfford: item => state.balance >= item.price,
    canAffordTotal: total => state.balance >= total,
    skin: skinOf(state.worn),
    buy,
    buyMany,
    wear
  }), [state, buy, buyMany, wear]);

  return <DogStoreContext.Provider value={value}>{children}</DogStoreContext.Provider>;
}

export function useDogStore() {
  const store = useContext(DogStoreContext);
  if (!store) throw new Error('useDogStore: wrap the screen in <DogStoreProvider>');
  return store;
}

/** The dog model for the items worn per slot: the worn skin's model, or the default Original Dog */
export function skinOf(wornBySlot) {
  const item = wornBySlot.skin ? byId(wornBySlot.skin) : null;
  return (item && item.skin) || DEFAULT_SKIN;
}

/** Accessory ids (for WornDog) of the items worn per slot: { head: 'bow', … } → ['bow'] */
export function accessoriesOf(wornBySlot) {
  return Object.values(wornBySlot).map(id => (id ? (byId(id) || {}).accessory : null)).filter(Boolean);
}

/** 300 → { whole: "300", fraction: "" }; 45.4 → { whole: "45", fraction: ",40" } (Telegram style) */
export function formatStars(value) {
  const whole = Math.floor(value);
  const cents = Math.round((value - whole) * 100);
  return { whole: String(whole), fraction: cents ? `,${String(cents).padStart(2, '0')}` : '' };
}
