# CoinPulse — installable crypto market tracker

A free-to-deploy Progressive Web App (PWA) designed for mobile screens. It can be added to an Android phone's home screen and opens like an app.

## Included
- Cryptocurrency market list, prices, 24-hour percentage changes, market cap and volume
- Search across coins using the CoinGecko search endpoint
- Market cap, volume, gainers and losers sorting
- Coin detail screen with 24-hour, 7-day, 1-month and 1-year price charts
- Device-local watchlist
- Auto refresh every 90 seconds, manual refresh and dark/light theme
- Market summary from current data; optional Gemini-generated text via a Netlify Function
- PWA manifest and service worker for installation and cached app shell

## Deploy to Netlify for free
1. Extract this ZIP on your computer.
2. Create a free GitHub repository and upload the files/folders from this project.
3. In Netlify, choose **Add new project → Import an existing project**, connect GitHub, and select the repository.
4. Publish directory is `.`. No build command is required for the static app.
5. Deploy. Netlify will provide a public HTTPS URL.

## Install on Android
1. Open the deployed Netlify URL in Chrome.
2. Open the browser menu (⋮).
3. Choose **Install app** or **Add to Home screen**.
4. Confirm. CoinPulse will appear on your phone like an app.

## Market data and API limits
The app requests public market data from CoinGecko. API access, availability, and rate limits can change. If requests fail with an authorization or rate-limit message, create a free CoinGecko Demo API key and use the ⚙ button in the app to save it on that device. The key is stored in browser local storage and is not a secret once used by the browser. Do not put a paid/private API key in public source code.

## Optional AI summaries
Without an AI key, the app still generates a data-based summary locally through the Netlify Function. To enable Gemini-written summaries:
1. Create a Gemini API key in a Google AI developer account, if available to you.
2. In Netlify, open **Site configuration → Environment variables**.
3. Add `GEMINI_API_KEY` with your key as its value.
4. Trigger a new deploy.
The key stays in the Netlify function environment rather than being included in the browser JavaScript. AI provider access and free quotas can change, so the local summary fallback remains available.

## Notes
- This is a market information tracker, not a wallet or exchange.
- No account, deposits, private keys, trades, or financial transactions are included.
- Watchlist and theme settings are saved only in the browser on the current device.
- When offline, the app shell may load, but live prices and charts need an internet connection.
- The app is provided as a starter project; test the deployed site on your own device and check API access before relying on it.


## Updated interface
- Always-visible Install button with platform-specific installation instructions if the browser does not expose its native install prompt
- Back arrow in the top bar on non-home screens; coin details return to the previous market/watchlist view
- Currency selector for USD, EUR, GBP and PKR display
- Refined premium-style dark theme, responsive layout, hover/focus states and light theme toggle

**Important:** The Install button cannot install an app directly from a local ZIP. Deploy the project to Netlify over HTTPS first, then install from your phone's browser.
