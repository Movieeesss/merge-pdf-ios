# Merge PDF – PWA → Android APK Guide

## Project Structure
```
merge-pdf/
├── public/
│   ├── manifest.json          ✅ Full PWABuilder-compliant manifest
│   ├── sw.js                  ✅ Service worker (cache-first, offline support)
│   ├── offline.html           ✅ Offline fallback page
│   ├── icon-72.png  ... 512   ✅ All required icon sizes
│   ├── icon-maskable-192.png  ✅ Maskable icons for Android adaptive icons
│   ├── icon-maskable-512.png
│   ├── screenshot-mobile.png  ✅ Required for Play Store listing
│   └── screenshot-wide.png    ✅ Required for Play Store listing
├── src/
│   ├── main.tsx               ✅ SW registration
│   ├── Mergepdf.tsx           ✅ Full app component
│   └── style.css              ✅ Polished mobile-first styles
├── index.html                 ✅ PWA meta tags
├── vite.config.ts             ✅ Optimized build
├── manifest.json (root copy for dev server)
└── package.json
```

---

## Step 1 – Install & Build

```bash
npm install
npm run build
```
This creates a `dist/` folder ready to deploy.

---

## Step 2 – Host Your PWA (Required for PWABuilder)

You MUST host the built app on a public HTTPS URL.

**Option A – GitHub Pages (Free)**
1. Push your repo to GitHub
2. Go to Settings → Pages → Source: `gh-pages` branch
3. Run: `npm install --save-dev gh-pages`
4. Add to package.json scripts: `"deploy": "gh-pages -d dist"`
5. Run: `npm run build && npm run deploy`
6. Your URL: `https://yourusername.github.io/merge-pdf/`

**Option B – Netlify (Free, easiest)**
1. Go to netlify.com → "Add new site" → "Deploy manually"
2. Drag and drop the `dist/` folder
3. Get instant HTTPS URL like: `https://merge-pdf-xyz.netlify.app`

**Option C – Vercel (Free)**
```bash
npm install -g vercel
vercel --prod
```

---

## Step 3 – Validate PWA on PWABuilder

1. Go to: **https://www.pwabuilder.com**
2. Enter your hosted HTTPS URL
3. Click **"Start"**
4. You should see **all green checkmarks** ✅
   - Required: start_url, short_name, icons, name ✅
   - Recommended: id, orientation, display, theme_color, screenshots, background_color, description ✅
   - Service Worker: Offline support ✅

---

## Step 4 – Generate APK

1. On PWABuilder results page, click **"Package for stores"**
2. Select **"Android"** tab
3. Click **"Generate"**
4. Download the zip file containing:
   - `app-release-bundle.aab` (Google Play Store)
   - `app-release-signed.apk` (Direct install / sideload)

### APK Settings to configure in PWABuilder:
| Field | Value |
|-------|-------|
| Package ID | `com.yourname.mergepdf` |
| App version | `1` |
| App version name | `1.0.0` |
| Display mode | `standalone` |
| Status bar color | `#92d050` |
| Nav bar color | `#92d050` |
| Splash screen color | `#ffffff` |
| Orientation | `portrait` |

---

## Step 5 – Install APK on Android

**Direct sideload (no Play Store needed):**
1. Transfer `app-release-signed.apk` to your phone
2. On Android: Settings → Security → "Install unknown apps" → enable for Files app
3. Open the APK file and install

**Or use ADB:**
```bash
adb install app-release-signed.apk
```

---

## PWABuilder Checklist Summary

| Requirement | Status |
|-------------|--------|
| HTTPS hosting | ✅ (after deploy) |
| manifest.json with all fields | ✅ |
| Service Worker registered | ✅ |
| Offline page | ✅ |
| Icons 192×192 + 512×512 | ✅ |
| Maskable icons | ✅ |
| Screenshots (narrow + wide) | ✅ |
| theme_color | ✅ |
| background_color | ✅ |
| display: standalone | ✅ |
| orientation | ✅ |
| scope | ✅ |
| id | ✅ |
| shortcuts | ✅ |
