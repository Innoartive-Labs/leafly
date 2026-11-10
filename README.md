# Leafly

Leafly is a Chrome extension that draws optional ambient nature effects on accessible websites. Manual mode works without weather requests. In weather mode it uses Open-Meteo to select an effect. Accumulation starts after the configured inactivity period; returning can trigger a broom sweep.

## Install for development

Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select this directory. Restricted browser pages and the Chrome Web Store cannot display the overlay.

## Structure

- `manifest.json`: Manifest V3 configuration and permissions.
- `content/content.js`: self-contained page overlay and inactivity runtime.
- `content/particle-engine.js` and `content/weather-effects.js`: popup preview engine.
- `background/`: weather requests, scheduling, location and tab handling.
- `popup/` and `settings/`: extension controls.
- `shared/`: storage, defaults, validation, messaging and theme.
- `assets/`: bundled icons and illustrations.

## Privacy and permissions

Preferences, exclusions, location and cached weather are stored in `chrome.storage.local`. A city search sends its text to Open-Meteo; weather mode, a manual refresh, or selecting a location sends coordinates to Open-Meteo. Requests disclose the user's IP address to the provider. See [Open-Meteo terms and privacy](https://open-meteo.com/en/terms). No analytics or advertising code is included.

`storage` saves data, `alarms` schedules weather checks, and `tabs` supports site exclusions and updates. The content script runs on accessible sites to draw the overlay and detect inactivity; Open-Meteo host permissions allow weather and location requests. Chrome restricts extension access on some pages.

Weather data: [Open-Meteo](https://open-meteo.com/), adapted to effects, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The free API has non-commercial use and rate limits; review the provider's terms for your distribution.

## Publishing

Before submission, provide the Chrome Web Store listing, screenshots, support details, a publicly accessible privacy policy and accurate data-use and permission disclosures. Verify rights to the extension name and assets, provider licensing, and test the packaged build in Chrome. Store acceptance is subject to Google's review.
