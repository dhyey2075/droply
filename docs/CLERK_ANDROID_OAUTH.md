# Clerk + Android (Capacitor) OAuth Setup

If **Google Sign-In** in the Android app shows "Unauthorized request" / `authorization_invalid`, the app and dashboards need to be set up for OAuth inside the Android WebView.

## 0. WebView third-party cookies (already applied in CI)

OAuth in Android WebView needs **third-party cookies** enabled so Clerk and Google can complete the redirect flow. This is done by a custom `MainActivity` that calls `CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)`.

- **CI builds:** The workflow copies `scripts/android-MainActivity.java` into the Android project, so no action needed.
- **Local builds:** Copy the same file into your Android project so the fix is applied:
  ```bash
  mkdir -p android/app/src/main/java/com/yourname/droply
  cp scripts/android-MainActivity.java android/app/src/main/java/com/yourname/droply/MainActivity.java
  ```
  Then rebuild the app.

## 1. Clerk Dashboard – Allowed redirect URLs

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application.
2. Go to **Paths** (or **Configure** → **Paths**).
3. Under **Allowed redirect URLs**, add:
   - `https://droply.dhyeyparekh.in/signin/sso-callback`
   - If you use another domain for the same app, add its callback too, e.g. `https://your-domain.com/signin/sso-callback`.
4. Save.

The Android app loads your site from this URL, so the OAuth callback must use the same origin.

## 2. Google Cloud Console – OAuth client

1. Open [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**.
2. Open the **OAuth 2.0 Client ID** used by Clerk for Google sign-in (usually "Web client").
3. Under **Authorized redirect URIs**, ensure you have Clerk’s redirect URI (from Clerk Dashboard → **User & Authentication** → **Social Connections** → Google → redirect URI). Do **not** add `https://droply.dhyeyparekh.in/...` here; Google redirects to Clerk, and Clerk redirects to your app.
4. Under **Authorized JavaScript origins**, add:
   - `https://droply.dhyeyparekh.in`
   So that requests from your deployed site (and the Android WebView) are allowed.

## 3. Summary

- **Clerk**: Allowed redirect URL = `https://droply.dhyeyparekh.in/signin/sso-callback`.
- **Google**: Authorized JavaScript origin = `https://droply.dhyeyparekh.in`.

After saving in both dashboards, try Google Sign-In again in the Android app.
