# iwant

A personal wishlist PWA. Queue things you want to buy, mark what's ready, and see at a glance what fits your budget.

## Features

- Add items in seconds — title and optional price
- Glanceable list with priority, price, and quick Ready / Got it actions
- Budget tab shows what's left and what's affordable now
- Fully offline — all data stored locally in IndexedDB
- Export and import your data as JSON

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

Pushes to `main` run the GitHub Actions workflow, which builds the app and deploys the `dist` folder.

**One-time setup:** In your repo → Settings → Pages → Build and deployment → Source, choose **GitHub Actions** (not “Deploy from branch”).

The app is served at `https://<username>.github.io/iwant/`.
