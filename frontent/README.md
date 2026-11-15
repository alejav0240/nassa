<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d933d68c-3173-4a8b-8c24-06125c376733

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

For the local FastAPI backend, start it on `http://127.0.0.1:8000` and open the Vite frontend on `http://127.0.0.1:3000`. The frontend uses `/api` on the same origin; Vite proxies those requests to FastAPI, including `/api/health` and `/api/ml/climate-anomalies`. `VITE_API_BASE_URL` is optional. If set to the API origin (for example `http://127.0.0.1:8000`), the client appends `/api`; direct cross-origin access then requires that browser origin in backend `CORS_ORIGINS`.
