# Skeleton Dog — скин маскота

Самостоятельная модель собачки: свои SVG, своя структура слоёв, свои данные морфинга
и свой движок отрисовки. Поведение (12-секундная последовательность, тайминг, амплитуды,
точки вращения, движения частей тела) общее с Original Dog: настройки поведения
и траектории частей тела берутся из оригинального компонента только для чтения.
Поэтому при смене скина меняется только внешний вид.

## Состав

```text
variants/
├── index.js                      реестр скинов: SKINS.original, SKINS.skeleton
└── skeleton/
    ├── assets/                   skeleton-pose-1.svg, skeleton-pose-2.svg (исходники)
    ├── animations/
    │   ├── skeletonAnimation.js  движок скина (createSkeletonAnimation)
    │   ├── skeletonMorph.js      морфинг контуров, градиентов, свечения
    │   └── skeletonMorphData.json
    ├── components/SkeletonDog.jsx
    ├── tools/build_skeleton_data.py
    ├── demo/                     сравнение Original и Skeleton на общем таймере
    └── index.js
```

## Использование

```jsx
import { SkeletonDog } from './mascot/variants/skeleton/index.js';
<SkeletonDog size={240} />
```

Пропсы и методы те же, что у `DogMascot`: `size`, `playing`, `startTime`, `onFrame`,
`play()`, `pause()`, `seek()`. Переключение скинов:

```jsx
import { SKINS } from './mascot/variants/index.js';
const { Component } = SKINS[skin];   // 'original' | 'skeleton'
<Component size={240} />
```

Сравнение двух скинов: `cd mascot && npm run dev`, затем открыть
`http://localhost:5173/variants/skeleton/demo/`.

## Как устроены кости

Каждая кость, ребро, позвонок и пятно свечения — элемент своей части тела:

- кости лап, подушечки и пальцы — в группе лапы: поворачиваются вместе с ней,
  а их форма плавно переходит от первой позы ко второй;
- рёбра и кости корпуса — в группе корпуса: дышат вместе с ним и плавно
  переезжают на свои места во второй позе;
- позвонки хвоста — в группе хвоста и покачиваются вместе с ним;
- глаза: основа, градиент, свечение и блик моргают вместе.

Свечение — размытие (`feGaussianBlur`), его сила плавно меняется между позами.
Блик на мордочке в первой позе радиальный, а во второй линейный, поэтому на переходе
два его варианта плавно сменяют друг друга.

## Пересборка данных

После изменения SVG в `assets/`:

```bash
python3 mascot/variants/skeleton/tools/build_skeleton_data.py
```

## TGS

Размытие относится к эффектам слоя, а их Telegram TGS не поддерживает. При экспорте
в стикер свечение нужно будет заменить радиальными градиентами с прозрачным краем.
