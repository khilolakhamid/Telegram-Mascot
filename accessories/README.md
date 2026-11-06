# accessories — аксессуары для собачки

Аксессуары — самостоятельные компоненты. Собачка (`../mascot`) не изменяется и ничего о них не знает:
аксессуар надевается во время работы, поверх уже нарисованной собачки, и снимается без следа.
Каждый аксессуар лежит в своей папке и импортируется отдельно.

| Аксессуар | Папка | Компонент |
|---|---|---|
| Новогодняя шапочка | [`head/christmas-hat/`](head/christmas-hat/) | `ChristmasHat` |
| Бантик | [`head/bow/`](head/bow/) | `Bow` |
| Уточка | [`head/duck/`](head/duck/) | `Duck` |
| Сыр | [`head/cheese/`](head/cheese/) | `Cheese` |
| Очки | [`eyes/glasses/`](eyes/glasses/) | `Glasses` |
| Розовые очки | [`eyes/pink-glasses/`](eyes/pink-glasses/) | `PinkGlasses` |
| Морковка во рту | [`mouth/carrot/`](mouth/carrot/) | `Carrot` |
| Мячик во рту | [`mouth/ball/`](mouth/ball/) | `Ball` |
| Косточка во рту | [`mouth/bone/`](mouth/bone/) | `Bone` |

## Подключение

```tsx
import { DogMascot } from '../mascot/index.js';
import { ChristmasHat } from '../accessories/head/christmas-hat';

<ChristmasHat>
  <DogMascot size={240} />
</ChristmasHat>
```

Несколько аксессуаров сразу — вложением, внешним идёт `ChristmasHat`
(`Duck`, `Cheese`, `Bow`, `Glasses`, `PinkGlasses`, `Carrot`, `Ball` и `Bone` можно вкладывать друг в друга):

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
(поворот головы, приседание, поза 2, возвращение), включение и выключение каждого аксессуара,
фоны и размеры (240, 120, 64 px). Холст примерочной шире кадра собачки 240×240: сверху 36,
по бокам 20 и снизу 8 единиц запаса (`ROOM` в `demo/App.jsx`), чтобы аксессуары над головой
(уточка, шапочка) были видны целиком во всём цикле. Кадр собачки 240×240 можно обвести пунктиром.

## Состав

```text
accessories/
├── head/                      аксессуары на голову
│   ├── christmas-hat/         новогодняя шапочка (ChristmasHat.tsx, SVG, анимации)
│   ├── bow/                   бантик (Bow.tsx, SVG, анимации)
│   ├── duck/                  уточка (Duck.tsx, SVG, анимации)
│   └── cheese/                сыр (Cheese.tsx, SVG, анимации)
├── eyes/                      аксессуары для глаз
│   ├── glasses/               очки (Glasses.tsx, SVG, анимации)
│   └── pink-glasses/          розовые очки (PinkGlasses.tsx, SVG, анимации)
├── mouth/                     аксессуары для рта
│   ├── carrot/                морковка (Carrot.tsx, SVG, анимации)
│   ├── ball/                  мячик (Ball.tsx, SVG, анимации)
│   └── bone/                  косточка (Bone.tsx, SVG, анимации)
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
import FLOWER_SVG from './assets/flower.svg?raw';

createHeadAccessory(svg, {
  name: 'flower', markup: FLOWER_SVG,
  placement: { scale: 1, pose1: { x, y, rotate }, pose2: { x, y, rotate } }
});
```

Аксессуар, который должен лежать под головой и ушками (как то, что во рту), — с `layer: 'under-head'`.

Если на референсах аксессуар в позах разного размера, у позы может быть свой `scale`
(как у бантика).

Значения `pose1` и `pose2` выдаёт `tools/fit_placement.py` (нужны `rsvg-convert` и Python с
numpy, scipy, opencv-python). Последний аргумент — по каким цветам искать: `hat` (красный и
серо-голубой), `carrot` (оранжевый и зелёный), `bow` (розовый), `ball`
(жёлто-зелёный), `duck` (жёлтый и оранжевый), `glasses` (салатовый и зелёный), `bone`
(кремовый и тёмно-коричневый), `cheese` (жёлтый и коричнево-оранжевый) или `pink-glasses`
(светло- и тёмно-розовый).
Если аксессуар закрывает глаза собачки, скриншот совмещается с ней по контуру и носу:

```bash
python3 accessories/tools/fit_placement.py flower.svg mascot/assets/dog-pose-1.svg reference-pose-1.png hat
```
