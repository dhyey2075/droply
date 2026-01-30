package com.yourname.droply;

import android.os.Build;
import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        // Required for OAuth (e.g. Google sign-in) in WebView: Clerk and providers
        // need third-party cookies to complete the redirect flow.
        if (getBridge() != null && getBridge().getWebView() != null) {
            CookieManager.getInstance().setAcceptCookie(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                CookieManager.getInstance().setAcceptThirdPartyCookies(
                    getBridge().getWebView(),
                    true
                );
            }
        }
    }
}
