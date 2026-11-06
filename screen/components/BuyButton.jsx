import { useEffect, useState } from 'react';

// Star glyph from the "Type Icon" SVG (20 × 20); drawn in the current text colour (white here).
const TYPE_STAR =
  'M11.1341 0.861072C10.7771 -0.287024 9.22285 -0.287024 8.86588 0.861072L7.32271 5.82412C7.16306 6.33755 6.7052 6.68518 6.18859 6.68518H1.19477C0.0395852 6.68518 -0.440722 8.22992 0.493845 8.93946L2.27203 10.2895C3.14513 10.9524 4.24429 11.2445 5.33128 11.1025L10.183 10.4688C10.4981 10.4276 10.6482 10.8614 10.3806 11.0403L5.69708 14.1726C4.90453 14.7027 4.31775 15.4885 4.03466 16.399L3.42395 18.3631C3.06698 19.5112 4.32443 20.4659 5.259 19.7564L9.29908 16.689C9.71703 16.3717 10.283 16.3717 10.7009 16.689L14.741 19.7564C15.6756 20.4659 16.933 19.5112 16.576 18.3631L15.0329 13.4C14.8732 12.8866 15.0481 12.3242 15.4661 12.0068L19.5062 8.93946C20.4407 8.22992 19.9604 6.68518 18.8052 6.68518H13.8114C13.2948 6.68518 12.8369 6.33755 12.6773 5.82412L11.1341 0.861072Z';

/**
 * The big blue capsule at the bottom of the Dog sheet, for the selected item:
 *   "Buy for ★ <price>" — the item is not owned yet; the price comes from its data. `onBuy` buys it
 *   (local store, no real payment). With too few stars it looks the same, but the tap buys nothing.
 *   "Apply Style" (`mode="apply"`) — the item is owned (bought, or free like the Christmas hat);
 *   `onApply` puts it on and closes the shop. No stars are spent.
 */
export default function BuyButton({ item, mode = 'buy', onBuy, onApply, disabled = false }) {
  // keep the last label on screen while the button fades out
  const [shown, setShown] = useState({ item, mode });
  useEffect(() => { if (item) setShown({ item, mode }); }, [item, mode]);
  const visible = Boolean(item);
  const current = item ? { item, mode } : shown;
  const price = current.item?.price;
  const apply = current.mode === 'apply';

  const press = () => {
    if (!visible) return;
    if (apply) { if (onApply) onApply(); }
    else if (!disabled && onBuy) onBuy();
  };

  return (
    <div className={`buy-bar${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <button type="button" className={`buy-button${apply ? ' is-apply' : ''}`} tabIndex={visible ? 0 : -1}
        aria-label={apply ? 'Apply Style' : `Buy for ${price} stars`}
        aria-disabled={(!apply && disabled) || undefined} onClick={press}>
        {apply ? (
          <span>Apply Style</span>
        ) : (
          <>
            <span>Buy for</span>
            <svg className="buy-star" viewBox="0 0 20 20" aria-hidden="true"><path d={TYPE_STAR} fill="currentColor" /></svg>
            <span>{price}</span>
          </>
        )}
      </button>
    </div>
  );
}
