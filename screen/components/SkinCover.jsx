import { createContext, useContext } from 'react';
import { skinById } from '../data/skins.js';

// Whether the Dog sheet is open: live covers play only while it is visible.
export const SheetOpenContext = createContext(true);

// Card cover for a skin: the skin's own animated model (unchanged), as a preview in the card.
export default function SkinCover({ skin }) {
  const open = useContext(SheetOpenContext);
  const { Component, name } = skinById(skin);
  return (
    <span className="skin-cover" aria-hidden="true">
      <Component size={84} playing={open} title={name} />
    </span>
  );
}
