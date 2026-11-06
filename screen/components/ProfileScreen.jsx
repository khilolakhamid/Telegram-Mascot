import { createElement, Fragment, useRef } from 'react';
import { mascotTime, useMascotClock } from '../state/mascotClock.js';
import WornDog from './WornDog.jsx';
import ProfileGifts from './ProfileGifts.jsx';
import { useDogStore, accessoriesOf } from '../state/dogStore.jsx';
import { skinById } from '../data/skins.js';
import SCREEN from '../assets/profileScreen.json';

/**
 * Profile screen from Figma (402 × 871 pt).
 *
 * Vector data in ../assets/profileScreen.json is the original Figma SVG as an element tree
 * ([tag, attributes, children]); the components below only arrange it. Changes made to the
 * export to match Figma: soft (feathered) avatar-pattern mask, plus-darker icon colour baked in,
 * two edge icons that the export dropped, and Glass Back/Edit buttons rebuilt in HTML/CSS.
 */

let key = 0;
const Node = node => {
  if (!node) return null;
  const [tag, attrs, children] = node;
  return createElement(tag, { key: key++, ...attrs }, ...children.map(Node));
};

const T = SCREEN;
const H = T[1][2]; // header children

/* ---- Sections ---- */
const Defs = () => Node(T[25]);
const Background = () => Node(T[0]);
const Cover = () => <>{Node(H[0])}{Node(H[1])}{Node(H[2])}</>;
const Avatar = () => Node(H[7]);
const ProfileName = () => <g aria-label="Chloe">{Node(H[8])}{Node(H[9])}</g>;
const ProfileStatus = () => <g aria-label="online">{Node(H[10])}{Node(H[11])}</g>;
const ProfileHeader = () => (
  <g {...T[1][1]}>
    <Cover />
    <Avatar />
    <ProfileName />
    <ProfileStatus />
  </g>
);
const SectionHeader = () => <g aria-label="Channel, 2 548 subscribers">{Node(T[9])}{Node(T[10])}</g>;
const ChannelCard = () => <g aria-label="Chloe's life">{T.slice(11, 22).map(Node)}</g>;
const InfoCard = () => <g aria-label="mobile, birthday">{Node(T[22])}</g>;
const PostsButton = () => <g role="button" aria-label="Posts">{Node(T[23])}{Node(T[24])}</g>;

/* ---- Glass buttons: glass fill, backdrop blur, shadow, thin light rim with highlights ---- */
function GlassButton({ name, label, x, w, glyph }) {
  const id = `rim-${name}`;
  return (
    <div className={`glass ${name}`} role="button" aria-label={label}>
      <svg viewBox={`${x} 62 ${w} 44`} fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={id} x1={x} y1={62} x2={x + w} y2={106} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
            <stop offset=".3" stopColor="#fff" stopOpacity={0.04} />
            <stop offset=".7" stopColor="#fff" stopOpacity={0.04} />
            <stop offset="1" stopColor="#fff" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <rect x={x + 0.5} y={62.5} width={w - 1} height={43} rx={21.5} stroke={`url(#${id})`} strokeWidth={1} />
        {Node(glyph)}
      </svg>
    </div>
  );
}
const BackButton = () => <GlassButton name="back" label="Back" x={16} w={44} glyph={H[4]} />;
const EditButton = () => <GlassButton name="edit" label="Edit" x={334} w={52} glyph={H[6]} />;

/* ---- System status bar (time, signal, Wi-Fi, battery) ----
   A separate layer above everything: it stays in place while a sheet is presented. */
export function StatusBar() {
  return (
    <svg className="status-bar" viewBox="0 0 402 871" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Status bar">
      {T.slice(2, 9).map(Node)}
    </svg>
  );
}

/* ---- Mascot: the animated dog component, placed at the avatar's lower right ----
   Box 64 × 64 pt at (216.2, 129.8) in screen coordinates — the dog's standard 64 px size. */
export const MASCOT_BOX = { x: 216.2, y: 129.8, size: 64 };

function AvatarMascot({ onPress }) {
  const { x, y, size } = MASCOT_BOX;
  const { worn, skin } = useDogStore();   // bought accessories the dog wears, per slot; its (bought) skin
  const { Component: Dog } = skinById(skin);
  const dogRef = useRef(null);
  useMascotClock(dogRef);   // one timeline with the Dog shop: never restarts on screens, accessories or skins
  return (
    <div
      className="mascot-slot"
      role="button"
      tabIndex={0}
      aria-label="Dog accessories"
      onClick={onPress}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress && onPress(); } }}
      style={{
        left: `${(x / 402) * 100}%`,
        top: `${(y / 871) * 100}%`,
        width: `${(size / 402) * 100}%`
      }}
    >
      <WornDog key={skin} worn={accessoriesOf(worn)} fill>
        <Dog key={skin} ref={dogRef} startTime={mascotTime()} size="100%" title="Dog mascot" />
      </WornDog>
    </div>
  );
}

export default function ProfileScreen({ onMascotPress }) {
  return (
    <div className="canvas">
      <svg className="ui" viewBox="0 0 402 871" fill="none" xmlns="http://www.w3.org/2000/svg">
        <Background />
        <ProfileHeader />
        <SectionHeader />
        <ChannelCard />
        <InfoCard />
        <PostsButton />
        <Defs />
      </svg>
      <ProfileGifts />
      <AvatarMascot onPress={onMascotPress} />
      <BackButton />
      <EditButton />
    </div>
  );
}
