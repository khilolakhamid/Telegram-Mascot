# Telegram Mascot

Анимированный маскот для Telegram: собачка, её аксессуары и экран приложения.

```text
Telegram-Mascot/
├── mascot/        собачка: SVG, анимации, React-компонент, демо
├── accessories/   аксессуары: новогодняя шапочка, примерочная
└── screen/        экран из Figma (следующий этап)
```

## Собачка

Готовый компонент с программной SVG-анимацией. Он повторяет 12-секундную последовательность:
три блока первой позы по 3 секунды, затем игривое приседание и возвращение (3 секунды).

```bash
cd mascot
npm install
npm run dev
```

Подробности — в [`mascot/README.md`](mascot/README.md).

## Аксессуары

Надеваются на собачку поверх, не меняя `mascot/`. Шапочку можно включать и выключать.

```bash
cd accessories
npm install
npm run dev
```

Подробности — в [`accessories/README.md`](accessories/README.md).
