package de.pfeilfrei.game;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONObject;

import java.util.Collections;
import java.util.List;

/**
 * Arrow Escape: Die App zeigt das Spiel (assets/index.html) in einer WebView an.
 * Über "AndroidBridge" kann das Spiel Fortschritt speichern, vibrieren und die Vollversion kaufen.
 *
 * Vollversion: einmaliger Kauf über Google Play. In der Play Console muss dafür ein
 * In-App-Produkt mit der ID "vollversion" angelegt sein (Preis dort, z. B. 1,99 €).
 * Der Kaufstatus wird zusätzlich in den SharedPreferences gemerkt ("full"), damit die
 * Vollversion auch offline sofort beim Start freigeschaltet ist.
 */
public class MainActivity extends Activity {

    static final String PRODUCT_FULL = "vollversion";

    private WebView web;
    private SharedPreferences prefs;
    private BillingClient billing;
    private ProductDetails fullProduct;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("pfeilfrei", Context.MODE_PRIVATE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.paper));
        web = new WebView(this);
        web.setBackgroundColor(getColor(R.color.paper));
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        // Randlos zeichnen (auf allen Android-Versionen gleich) ...
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            View decor = getWindow().getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility()
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }

        // ... und dann Abstand zu Statusleiste, Navigationsleiste und Kamera-Aussparung halten
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int left, top, right, bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                left = i.left; top = i.top; right = i.right; bottom = i.bottom;
            } else {
                left = insets.getSystemWindowInsetLeft();
                top = insets.getSystemWindowInsetTop();
                right = insets.getSystemWindowInsetRight();
                bottom = insets.getSystemWindowInsetBottom();
            }
            v.setPadding(left, top, right, bottom);
            // Verbraucht, damit die WebView den Abstand nicht noch einmal einrechnet
            return Build.VERSION.SDK_INT >= 30 ? WindowInsets.CONSUMED : insets.consumeSystemWindowInsets();
        });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(this), "AndroidBridge");
        // Test-APK ("voll-test") braucht keinen Play Store: dort ist ohnehin alles freigeschaltet
        if (!BuildConfig.TEST_FULL) setupBilling();

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
        } else {
            web.loadUrl("file:///android_asset/index.html");
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        // Blitzmodus: Uhr anhalten und Restzeit speichern, bevor die WebView pausiert
        web.evaluateJavascript("window.pfPause && window.pfPause()", null);
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // Käufe, die im Hintergrund fertig geworden sind (z. B. Barzahlung), oder Erstattungen übernehmen
        refreshPurchases();
    }

    @Override
    protected void onDestroy() {
        if (billing != null) billing.endConnection();
        web.destroy();
        super.onDestroy();
    }

    /* ---------- Vollversion (Google Play Billing) ---------- */

    boolean isFull() {
        return BuildConfig.TEST_FULL || prefs.getBoolean("full", false);
    }

    /** Ruft eine Funktion im Spiel auf (immer auf dem UI-Thread). */
    private void callJs(String js) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    private void setupBilling() {
        billing = BillingClient.newBuilder(getApplicationContext())
                .setListener(this::onPurchasesUpdated)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection()
                .build();
        billing.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    queryFullProduct();
                    refreshPurchases();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Verbindet sich beim nächsten Aufruf von selbst neu (enableAutoServiceReconnection)
            }
        });
    }

    /** Produkt "vollversion" laden: wird zum Kaufen gebraucht und liefert den Preis in Landeswährung. */
    private void queryFullProduct() {
        if (billing == null) return;
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(Collections.singletonList(QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(PRODUCT_FULL)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build()))
                .build();
        billing.queryProductDetailsAsync(params, (result, details) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || details == null) return;
            for (ProductDetails pd : details.getProductDetailsList()) {
                if (!PRODUCT_FULL.equals(pd.getProductId())) continue;
                fullProduct = pd;
                List<ProductDetails.OneTimePurchaseOfferDetails> offers = pd.getOneTimePurchaseOfferDetailsList();
                if (offers != null && !offers.isEmpty()) {
                    String price = offers.get(0).getFormattedPrice();
                    prefs.edit().putString("price", price).apply();
                    callJs("window.pfPrice && window.pfPrice(" + JSONObject.quote(price) + ")");
                }
            }
        });
    }

    /** Gekaufte Produkte abfragen: schaltet frei (auch nach Neuinstallation) oder sperrt nach Erstattung. */
    private void refreshPurchases() {
        if (billing == null || !billing.isReady()) return;
        billing.queryPurchasesAsync(
                QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> {
                    // Offline oder Fehler: gemerkten Stand behalten
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) return;
                    boolean owned = false;
                    for (Purchase p : purchases) if (handlePurchase(p)) owned = true;
                    setOwned(owned);
                });
    }

    private void setOwned(boolean owned) {
        boolean before = isFull();
        prefs.edit().putBoolean("full", owned).apply();
        if (isFull() != before) callJs("window.pfSetFull && window.pfSetFull(" + isFull() + ")");
    }

    /** true, wenn der Kauf die Vollversion ist und bezahlt wurde. Bestätigt ihn bei Google (sonst Erstattung nach 3 Tagen). */
    private boolean handlePurchase(Purchase p) {
        if (!p.getProducts().contains(PRODUCT_FULL)) return false;
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return false;
        if (!p.isAcknowledged()) {
            billing.acknowledgePurchase(
                    AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(),
                    r -> { });
        }
        return true;
    }

    /** Antwort auf einen Kauf (vom Spiel über AndroidBridge.buy() gestartet). */
    private void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            boolean owned = false, pending = false;
            for (Purchase p : purchases) {
                if (handlePurchase(p)) owned = true;
                else if (p.getProducts().contains(PRODUCT_FULL)
                        && p.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
            }
            if (owned) purchaseDone();
            else if (pending) callJs("window.pfPurchase && window.pfPurchase('pending')");
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            purchaseDone();
        } else if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            callJs("window.pfPurchase && window.pfPurchase('cancel')");
        } else {
            callJs("window.pfPurchase && window.pfPurchase('error')");
        }
    }

    private void purchaseDone() {
        prefs.edit().putBoolean("full", true).apply();
        callJs("window.pfPurchase && window.pfPurchase('ok')");
    }

    /** Kaufdialog von Google Play öffnen. */
    void startPurchase() {
        if (isFull()) { purchaseDone(); return; }
        if (billing == null || !billing.isReady() || fullProduct == null) {
            // Produkt nicht geladen: offline, App nicht aus dem Play Store oder Produkt fehlt in der Play Console
            queryFullProduct();
            callJs("window.pfPurchase && window.pfPurchase('error')");
            return;
        }
        BillingFlowParams.ProductDetailsParams.Builder item =
                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(fullProduct);
        List<ProductDetails.OneTimePurchaseOfferDetails> offers = fullProduct.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) item.setOfferToken(offers.get(0).getOfferToken());
        BillingResult r = billing.launchBillingFlow(this, BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(item.build()))
                .build());
        int code = r.getResponseCode();
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) purchaseDone();
        else if (code != BillingClient.BillingResponseCode.OK
                && code != BillingClient.BillingResponseCode.USER_CANCELED) {
            callJs("window.pfPurchase && window.pfPurchase('error')");
        }
    }

    /** Zurück-Taste: erst das Spiel fragen (z. B. zurück ins Menü), sonst App schließen. */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        web.evaluateJavascript("(window.pfBack && window.pfBack()) ? 'ja' : 'nein'", value -> {
            if (value == null || !value.contains("ja")) {
                finish();
            }
        });
    }

    /** Wird im Spiel als window.AndroidBridge angesprochen. */
    static class Bridge {
        private final MainActivity activity;
        private final Context ctx;
        private final SharedPreferences prefs;

        Bridge(MainActivity a) {
            activity = a;
            ctx = a.getApplicationContext();
            prefs = ctx.getSharedPreferences("pfeilfrei", Context.MODE_PRIVATE);
        }

        /** Vollversion gekauft (oder Test-APK)? */
        @JavascriptInterface
        public boolean isFull() {
            return activity.isFull();
        }

        /** Test-APK (Flavor vollTest)? Dann zeigt das Spiel unter Einstellungen das Debug-Fenster (Level wählen). */
        @JavascriptInterface
        public boolean isTest() {
            return BuildConfig.TEST_FULL;
        }

        /** Preis der Vollversion von Google Play (z. B. "1,99 €"), leer solange unbekannt. */
        @JavascriptInterface
        public String price() {
            return prefs.getString("price", "");
        }

        /** Kauf starten; das Ergebnis meldet die App über window.pfPurchase('ok' | 'pending' | 'cancel' | 'error'). */
        @JavascriptInterface
        public void buy() {
            activity.runOnUiThread(activity::startPurchase);
        }

        @JavascriptInterface
        public String load(String key) {
            return prefs.getString(key, null);
        }

        @JavascriptInterface
        public void save(String key, String value) {
            prefs.edit().putString(key, value).apply();
        }

        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public void vibrate(int ms) {
            Vibrator v = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            v.vibrate(VibrationEffect.createOneShot(Math.max(1, ms), VibrationEffect.DEFAULT_AMPLITUDE));
        }
    }
}
