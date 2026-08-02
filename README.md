# BST Visualizer

An interactive Binary Search Tree visualizer built with Next.js, React, and TypeScript. Insert, delete, search, and traverse a BST while watching every step of the algorithm animate in real time — highlighted comparisons, live pseudocode tracking, and a console log narrating each decision.

**Live demo:** https://bstvisualizernextjs.vercel.app

## Features

- **Insert / Delete / Search** with step-by-step animated walkthroughs
- **Predecessor / Successor** lookup
- **Select(k)** — find the k-th smallest value via in-order rank counting
- **Traversals** — Inorder, Preorder, Postorder, and Level Order, all animated
- Live pseudocode panel with the active line highlighted as each step plays
- Step-by-step console log narrating what the algorithm is doing
- Random tree generation and manual reset/clear
- Play / Pause / Reset animation controls with adjustable speed
- Zoom and pan on the tree canvas
- Light and dark themes
- Responsive layout with mobile-friendly slide-in panels

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [React](https://react.dev) 19
- [TypeScript](https://www.typescriptlang.org) (strict mode)
- Plain inline styles + a small global stylesheet for animations, hover states, and responsive breakpoints — no CSS framework

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it.

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # lint the project
```

## Project Structure

```
app/
  layout.tsx        Root layout, font loading, metadata
  page.tsx           Single route — renders the visualizer
  globals.css        Keyframe animations, hover states, responsive breakpoints

lib/
  bst.ts             Pure BST algorithms — insert, delete, search, traversals, layout
  theme.ts           Light/dark color token maps

components/
  BSTVisualizer.tsx  UI: controls, canvas rendering, animation playback, state
```

The tree algorithms in `lib/bst.ts` are plain, framework-agnostic functions decoupled from the UI — each user action builds a list of animation "steps" up front, which `BSTVisualizer.tsx` then plays back on a timer.

## Deployment

Deployed on [Vercel](https://vercel.com). Pushes to the connected GitHub repository trigger new deployments automatically.
