# Ethos Flower — Private Inventory (No Prices)

- Scrapes Dutchie server-side and extracts embedded JSON
- API: `/api/inventory` (JSON)
- UI: `/` (clean list, no prices)
- Always fresh: `Cache-Control: no-store`

## Deploy (Vercel, from iPhone)
1. Create a new GitHub repo and add these files (same paths).
2. In Vercel → **New Project** → import the repo → **Deploy**.
3. Visit:
   - **UI**: `https://<project>.vercel.app/`
   - **API**: `https://<project>.vercel.app/api/inventory`
