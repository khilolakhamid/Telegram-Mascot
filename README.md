# Telegram Mascot — skins branch

This branch contains the animated dog and its alternative skins: Skeleton Dog and UFO Dog.
The complete project (dog, accessories, skins and the Telegram profile screen with the Dog shop)
is on the [`main`](https://github.com/khilolakhamid/Telegram-Mascot/tree/main) branch.

```text
Telegram-Mascot/
└── mascot/          the animated dog: source SVGs, animation engine, React component, demo
    └── variants/    skins: Skeleton Dog and UFO Dog
```

## Getting started

Requires Node.js 18 or newer.

```bash
cd mascot
npm install
npm run dev        # http://localhost:5173
```

Skin comparison pages: `/variants/skeleton/demo/` and `/variants/ufo/demo/` on the same dev server.

## Documentation

- [`mascot/README.md`](mascot/README.md): the dog component and its animation
- [Skeleton Dog](mascot/variants/skeleton/README.md) and [UFO Dog](mascot/variants/ufo/README.md): the skins
