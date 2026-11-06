# telegram-mascot — accessories branch

This branch contains the animated dog and its wearable accessories.
The complete project (dog, accessories, skins and the Telegram profile screen with the Dog shop)
is on the [`main`](https://github.com/khilolakhamid/telegram-mascot/tree/main) branch.

```text
telegram-mascot/
├── mascot/        the animated dog: source SVGs, animation engine, React component, demo
└── accessories/   wearable accessories (head, eyes, mouth), shared engine, try-on page
```

## Getting started

Requires Node.js 18 or newer.

```bash
cd mascot
npm install
npm run dev        # dog demo: http://localhost:5173
```

```bash
cd accessories
npm install
npm run dev        # accessories try-on page: http://localhost:5173
```

## Documentation

- [`mascot/README.md`](mascot/README.md): the dog component and its animation
- [`accessories/README.md`](accessories/README.md): the accessories and how to use them
