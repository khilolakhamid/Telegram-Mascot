import { useEffect, useRef, useState } from 'react';
import StarIcon from './StarIcon.jsx';
import AccessoryCard from './AccessoryCard.jsx';
import BuyButton from './BuyButton.jsx';
import { SheetOpenContext } from './SkinCover.jsx';
import { skinById } from '../data/skins.js';
import WornDog, { WEARABLES } from './WornDog.jsx';
import { ACCESSORIES, ACCESSORY_CATEGORIES, DEFAULT_CATEGORY, ALL_ITEMS_ORDER, EMPTY_CARDS } from '../data/accessories.js';
import { useDogStore, formatStars, skinOf } from '../state/dogStore.jsx';
import { mascotTime, useMascotClock } from '../state/mascotClock.js';

// Cards: only accessories that are actually available — a cover to show and a wearable to try on.
const AVAILABLE = ACCESSORIES.filter(item => item.Cover && (WEARABLES[item.accessory] || item.skin));
// All Items order: the listed ids first, then the rest in catalog order (no duplicates)
const rank = item => { const i = ALL_ITEMS_ORDER.indexOf(item.id); return i < 0 ? ALL_ITEMS_ORDER.length + AVAILABLE.indexOf(item) : i; };
const orderedFor = category => {
  const list = AVAILABLE.slice();
  return category === 'all' ? list.sort((a, b) => rank(a) - rank(b)) : list;
};

/**
 * "Dog" sheet — layout of Telegram's "Buy a Gift" sheet.
 * Slides up from the bottom (page sheet), X closes it with the reverse motion.
 */
export default function AccessoriesSheet({ open, onClose }) {
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const tabsRef = useRef(null);
  // tapping a tab that is partly hidden scrolls the tab row so it is fully visible
  const chooseCategory = (id, el) => {
    setCategory(id);
    const row = tabsRef.current;
    if (row && el) {
      const pad = 16, l = el.offsetLeft - pad, r = el.offsetLeft + el.offsetWidth + pad - row.clientWidth;
      if (row.scrollLeft > l) row.scrollTo({ left: l, behavior: 'smooth' });
      else if (row.scrollLeft < r) row.scrollTo({ left: r, behavior: 'smooth' });
    }
  };
  const inCategory = item =>
    category === 'mine' ? store.isOwned(item.id)
      : !item.free && (category === 'all' || item.category === category);   // free items are not for sale
  const [mounted, setMounted] = useState(open); // the dog is created on first open
  const store = useDogStore();

  // What the dog in the sheet has on, one per slot: the saved (worn) items plus try-ons. Opening the
  // sheet starts from what is saved; nothing is saved until Apply Style (closing with X drops try-ons).
  const dogRef = useRef(null);
  useMascotClock(dogRef, open);   // the shop's dog runs on the same timeline as the profile's
  const [selected, setSelected] = useState(store.worn);   // { head, eyes, mouth, skin }: id or null
  // Cart: unbought items picked for purchase — at most one per slot, in the order picked. Each has
  // a golden outline; the Buy button shows their total. Kept while switching tabs, cleared on reopen.
  const [cart, setCart] = useState([]);
  // Owned items picked by hand (per slot) — outlined, for Apply Style. What the dog already wears is
  // marked by the Pin, not outlined.
  const [picked, setPicked] = useState({});
  useEffect(() => {
    if (open) {
      setMounted(true); setSelected(store.worn); setCart([]); setPicked({});
      // every opening starts on My Stuff, with the tabs row scrolled back to its start
      setCategory(DEFAULT_CATEGORY);
      if (tabsRef.current) tabsRef.current.scrollLeft = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const byId = id => AVAILABLE.find(item => item.id === id) || null;
  const selectedItems = Object.values(selected).map(byId).filter(Boolean);
  const wornAccessories = selectedItems.map(item => item.accessory).filter(Boolean);   // skins are not worn on top

  // Bottom button: "Buy for ★ <total>" while the cart has unbought items; otherwise "Apply Style"
  // when an owned item is picked or the look tried on differs from what is saved.
  const cartItems = cart.map(byId).filter(item => item && !store.isOwned(item.id));
  const cartTotal = Math.round(cartItems.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
  const toBuy = cartItems.length ? { id: 'cart', price: cartTotal } : null;
  const ownedOrEmpty = id => id === null || store.isOwned(id);
  const lookChanged = Object.keys(store.worn).some(slot => ownedOrEmpty(selected[slot] ?? null) && (selected[slot] ?? null) !== store.worn[slot]);
  const pickedOwned = Object.values(picked).some(id => id && store.isOwned(id) && Object.values(selected).includes(id));
  const toApply = !toBuy && (pickedOwned || lookChanged) ? { id: 'look', price: 0 } : null;
  const isOutlined = item => (store.isOwned(item.id)
    ? picked[item.slot] === item.id && selected[item.slot] === item.id
    : cart.includes(item.id));

  // Tapping a card selects it and tries it on in the sheet; nothing is saved until Apply Style.
  // One item per slot (head, eyes, mouth, skin): picking another item for a slot replaces the
  // previous pick there — its outline, its price in the total and its try-on go away.
  // Skins and accessories never go together: picking a skin drops the picked accessories (head, eyes,
  // mouth), picking an accessory drops the skin (back to the original dog). Owned items stay in My Stuff.
  const ACCESSORY_SLOTS = ['head', 'eyes', 'mouth'];
  const conflictsOf = slot => (slot === 'skin' ? ACCESSORY_SLOTS : ['skin']);
  const dropSlots = slots => {
    setCart(c => c.filter(x => { const i = byId(x); return !(i && slots.includes(i.slot)); }));
    setPicked(p => { const n = { ...p }; for (const sl of slots) n[sl] = null; return n; });
    setSelected(s => { const n = { ...s }; for (const sl of slots) n[sl] = null; return n; });
  };
  // after a pick is taken off: if the dog is left without a skin, the saved accessories come back;
  // if it is left with no accessories, the saved skin comes back (the saved look is never mixed)
  const settle = (s, slot) => {
    const n = { ...s };
    if (slot === 'skin') { if (!n.skin) for (const sl of ACCESSORY_SLOTS) n[sl] = store.worn[sl]; }
    else if (!n.skin && ACCESSORY_SLOTS.every(sl => !n[sl])) n.skin = store.worn.skin;
    return n;
  };
  const toggleCard = item => {
    const { slot, id } = item;
    const sameSlot = x => { const i = byId(x); return i && i.slot === slot; };
    if (!store.isOwned(id)) {
      if (cart.includes(id)) {
        // tap again: unpick, the slot goes back to what is saved there
        setCart(c => c.filter(x => x !== id));
        setSelected(s => settle({ ...s, [slot]: store.worn[slot] }, slot));
      } else {
        dropSlots(conflictsOf(slot));
        setCart(c => [...c.filter(x => !sameSlot(x)), id]);
        setPicked(p => ({ ...p, [slot]: null }));
        setSelected(s => ({ ...s, [slot]: id }));
      }
      return;
    }
    // owned: pick it (outline + try-on) for Apply Style; tap again to take it off
    if (selected[slot] === id && picked[slot] !== id) {
      setCart(c => c.filter(x => !sameSlot(x)));
      setPicked(p => ({ ...p, [slot]: id }));
      return;
    }
    const next = selected[slot] === id ? null : id;
    if (next) dropSlots(conflictsOf(slot));
    setCart(c => c.filter(x => !sameSlot(x)));          // an owned pick replaces an unbought one too
    setSelected(s => (next ? { ...s, [slot]: next } : settle({ ...s, [slot]: null }, slot)));
    setPicked(p => ({ ...p, [slot]: next }));
  };

  // Buy: charge the cart total once; every item in the cart becomes owned (My Stuff). The look tried
  // on stays, so Apply Style can put the new things on. With too few stars nothing happens.
  const buySelected = () => {
    if (!cartItems.length || !store.canAffordTotal(cartTotal)) return;
    store.buyMany(cartItems);
    // the bought items that the dog has on in the sheet stay outlined (picked) for Apply Style
    setPicked(p => {
      const next = { ...p };
      for (const item of cartItems) if (selected[item.slot] === item.id) next[item.slot] = item.id;
      return next;
    });
    setCart([]);
  };
  // Apply Style: save the look tried on — every slot with an owned item or nothing (taken off);
  // unbought try-ons are left out — then close the shop. The Pin moves to what is saved.
  const applySelected = () => {
    for (const slot of Object.keys(store.worn)) {
      const id = selected[slot] ?? null;
      if (ownedOrEmpty(id)) store.wear(slot, id);
    }
    onClose();
  };
  const balance = formatStars(store.balance);
  const sheetSkin = skinOf(selected);                       // the selected (or worn) skin: the whole model changes
  const SheetDog = skinById(sheetSkin).Component;

  return (
    <section
      className={`sheet${open ? ' is-open' : ''}${toBuy || toApply ? ' has-selection' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Dog"
      aria-hidden={!open}
      inert={open ? undefined : ''}
    >
      <div className="sheet-scroll">
        <div className="sheet-content">
          <div className="sheet-header">
            <div className="balance" aria-label={`Balance ${balance.whole}${balance.fraction} stars`}>
              <div className="balance-label">Balance</div>
              <div className="balance-value">
                <StarIcon size={14} className="balance-star" />
                <span className="balance-whole">{balance.whole}</span>
                {balance.fraction && <span className="balance-fraction">{balance.fraction}</span>}
              </div>
            </div>

            <div className="sheet-dog">
              {mounted && (
                <WornDog key={sheetSkin} worn={wornAccessories}>
                  <SheetDog key={sheetSkin} ref={dogRef} startTime={mascotTime()} size={100} playing={open} title="Dog mascot" />
                </WornDog>
              )}
            </div>
            <h1 className="sheet-title">Dog</h1>
          </div>

          <p className="sheet-text">Make your dog unique with fun accessories!</p>

          <div className="tabs" ref={tabsRef}>
            <div className="tabs-row" role="tablist">
              {ACCESSORY_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  className={`tab${category === c.id ? ' is-active' : ''}`}
                  onClick={e => chooseCategory(c.id, e.currentTarget)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <SheetOpenContext.Provider value={open}>
            <div className="accessory-grid">
              {orderedFor(category).filter(inCategory).map(item => (
                <AccessoryCard key={item.id} item={item} selected={isOutlined(item)} onToggle={toggleCard}
                  showPrice={category !== 'mine'} square={category === 'mine'}
                  pinned={store.worn[item.slot] === item.id} />
              ))}
              {category === 'all' && Array.from({ length: EMPTY_CARDS }, (_, k) => (
                <div key={`empty-${k}`} className="accessory-card is-empty" aria-hidden="true">
                  <div className="accessory-card-bg" />
                </div>
              ))}
            </div>
          </SheetOpenContext.Provider>
        </div>
      </div>

      <BuyButton item={toBuy || toApply} mode={toApply ? 'apply' : 'buy'} onBuy={buySelected} onApply={applySelected}
        disabled={toBuy ? !store.canAffordTotal(cartTotal) : false} />

      <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
        <svg viewBox="0 0 44 44" fill="none" aria-hidden="true">
          <path d="M14.7 14.7L29.3 29.3M29.3 14.7L14.7 29.3" stroke="#000" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </section>
  );
}
