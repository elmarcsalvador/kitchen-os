# Kitchen OS

A JavaScript / Next.js inventory app with SQLite-compatible persistent storage. It includes product records, quantity and expiry tracking, barcode scans, barcode product identification and CSV export.

## Database

The app uses Turso (SQLite/libSQL) for Vercel. The same `@libsql/client` code uses a local SQLite file (`local.db`) when Turso environment variables are absent, and Turso Cloud when they are present. Vercel serverless instances do not have a permanent shared local filesystem, so the deployed app must be connected to Turso or another hosted database. Vercel lists Turso as a native Serverless SQLite integration: https://vercel.com/marketplace/tursocloud/database

Each product stores its quantity as a numeric amount and a separate unit. The form suggests matching saved products and can restock them using their existing category and unit. The app creates its table and starter examples on the first API request. Subsequent users share the same database. Local edits are not automatically copied to the cloud database.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. The app creates `local.db` in this project folder. That file is ignored by Git.

## Deploy to Vercel

1. Add this folder as a Vercel project (or deploy it with the Vercel CLI).
2. In Vercel, install the Turso Cloud integration for this project and create a database. The integration supplies `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
3. Deploy. The database schema and starter products are created automatically when the app first loads.

Turso setup documentation: https://vercel.com/marketplace/tursocloud/database

## Access

There is currently no login. Anyone who can reach the deployed URL can view and change its inventory. Add authentication or Vercel Deployment Protection before sharing the URL publicly if that access is not intended.
# kitchen-os
# kitchen-os
