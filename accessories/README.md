# accessories — аксессуары для собачки

Аксессуары — самостоятельные компоненты. Собачка (`../mascot`) не изменяется и ничего о них не знает:
аксессуар надевается во время работы, поверх уже нарисованной собачки, и снимается без следа.
Каждый аксессуар лежит в своей папке и импортируется отдельно.

| Аксессуар | Папка | Компонент |
|---|---|---|
| Новогодняя шапочка | [`head/christmas-hat/`](head/christmas-hat/) | `ChristmasHat` |
| Морковка во рту | [`mouth/carrot/`](mouth/carrot/) | `Carrot` |

## Подключение

```tsx
import { DogMascot } from '../mascot/index.js';
import { ChristmasHat } from '../accessories/head/christmas-hat';

<ChristmasHat>
  <DogMascot size={240} />
</ChristmasHat>
```

Несколько аксессуаров сразу — вложением, внешним идёт `ChristmasHat`:

```tsx
import { Carrot } from '../accessories/mouth/carrot';

<ChristmasHat>
  <Carrot>
    <DogMascot size={240} />
  </Carrot>
</ChristmasHat>
```

Подробности — в README папки аксессуара.

## Примерочная

Нужен Node.js 18 или новее.

```bash
cd accessories
npm install
npm run dev       # http://localhost:5173
```

На странице: Play / Pause, ползунок по всему 12-секундному циклу, быстрые переходы
(поворот головы, приседание, поза 2, возвращение), включение и выключение морковки и шапочки,
фоны и размеры (240, 120, 64 px).

## Состав

```text
accessories/
├── head/                      аксессуары на голову
│   └── christmas-hat/         новогодняя шапочка (ChristmasHat.tsx, SVG, анимации)
├── mouth/                     аксессуары для рта
│   └── carrot/                морковка (Carrot.tsx, SVG, анимации)
├── core/                      общий движок аксессуаров
│   ├── headAccessory.js       крепит SVG к голове собачки (над головой или под ней) и ведёт за головой
│   ├── inertia.js             инерция (пружины от движения головы)
│   └── pathDeform.js          деформация контуров SVG по точкам
├── tools/
│   └── fit_placement.py       замер посадки по картинкам-референсам
├── demo/                      примерочная (App.jsx, main.jsx, app.css)
├── index.html, index.js       примерочная и общий вход
├── package.json, vite.config.js, tsconfig.json, vite-env.d.ts
```

## Новый аксессуар на голову

Положите его в `head/<название>/` по образцу `christmas-hat/`:

```js
import { createHeadAccessory } from '../../core/headAccessory.js';
import BOW_SVG from './assets/bow.svg?raw';

createHeadAccessory(svg, {
  name: 'bow', markup: BOW_SVG,
  placement: { scale: 1, pose1: { x, y, rotate }, pose2: { x, y, rotate } }
});
```

Аксессуар, который должен лежать под головой и ушками (как то, что во рту), — с `layer: 'under-head'`.

Значения `pose1` и `pose2` выдаёт `tools/fit_placement.py` (нужны `rsvg-convert` и Python с
numpy, scipy, opencv-python). Последний аргумент — по каким цветам искать: `hat` (красный и
серо-голубой) или `carrot` (оранжевый и зелёный):

```bash
python3 accessories/tools/fit_placement.py bow.svg mascot/assets/dog-pose-1.svg reference-pose-1.png hat
```
