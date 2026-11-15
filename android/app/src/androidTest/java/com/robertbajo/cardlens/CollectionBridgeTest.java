package com.robertbajo.cardlens;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.os.Build;
import android.os.SystemClock;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.Iterator;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Real packaged WebView -> Capacitor -> Room smoke test, only on an opted-in emulator. */
@RunWith(AndroidJUnit4.class)
public class CollectionBridgeTest {
    private static final String PLUGIN = "window.Capacitor.Plugins.CardLensCollection";
    private final String ownId = UUID.randomUUID().toString();
    private Instrumentation instrumentation;
    private MainActivity activity;
    private boolean authorized;
    private boolean mayHaveCreatedRecord;

    @Before
    public void requireDisposableEmulator() {
        assertTrue("This test requires explicit disposable-emulator authorization.",
            "true".equals(InstrumentationRegistry.getArguments().getString("cardlensDisposableEmulator")));
        String fingerprint = String.valueOf(Build.FINGERPRINT).toLowerCase(Locale.ROOT);
        String model = String.valueOf(Build.MODEL).toLowerCase(Locale.ROOT);
        boolean emulatorFingerprint = fingerprint.startsWith("generic") || fingerprint.contains("emulator")
            || fingerprint.contains("sdk_gphone") || fingerprint.contains("google_sdk");
        boolean emulatorModel = model.contains("emulator") || model.contains("android sdk built for")
            || model.contains("sdk_gphone") || model.contains("google_sdk");
        assertTrue("Physical devices must never run this disposable collection test.",
            emulatorFingerprint && emulatorModel);
        instrumentation = InstrumentationRegistry.getInstrumentation();
        authorized = true;
    }

    @Test(timeout = 180_000)
    public void packagedBridgePreservesOwnRecordAcrossActivityRestartAndEnforcesCas() throws Exception {
        launch();
        awaitBridge();
        JSONObject fields = fixtureFields();
        String create = PLUGIN + ".createCard(" + new JSONObject().put("id", ownId).put("fields", fields) + ")";
        mayHaveCreatedRecord = true;
        JSONObject created = successful(create).getJSONObject("card");
        assertFields(created, fields);
        assertEquals(1L, created.getLong("revision"));
        assertTrue("Creation must have a real epoch timestamp.", created.getLong("createdAt") > 0);
        assertEquals(created.getLong("createdAt"), created.getLong("updatedAt"));
        assertFields(ownCard(), fields);

        JSONObject replay = successful(create).getJSONObject("card");
        assertFields(replay, fields);
        assertEquals(created.getLong("revision"), replay.getLong("revision"));
        assertEquals(created.getLong("createdAt"), replay.getLong("createdAt"));
        assertEquals(created.getLong("updatedAt"), replay.getLong("updatedAt"));

        JSONObject different = new JSONObject(fields.toString()).put("quantity", 2);
        expectCode(PLUGIN + ".createCard(" + new JSONObject().put("id", ownId).put("fields", different) + ")", "CONFLICT");

        JSONObject edited = new JSONObject(fields.toString())
            .put("quantity", 3).put("notes", "\n変更したメモ\r\n\tBehåll sista raden\n");
        JSONObject update = new JSONObject().put("id", ownId).put("expectedRevision", 1).put("fields", edited);
        JSONObject updated = successful(PLUGIN + ".updateCard(" + update + ")").getJSONObject("card");
        assertFields(updated, edited);
        assertEquals(2L, updated.getLong("revision"));
        assertEquals(created.getLong("createdAt"), updated.getLong("createdAt"));
        assertTrue("An update must advance its timestamp.", updated.getLong("updatedAt") > created.getLong("updatedAt"));
        expectCode(PLUGIN + ".updateCard(" + update + ")", "CONFLICT");
        expectCode(PLUGIN + ".deleteCard(" + new JSONObject().put("id", ownId).put("expectedRevision", 1) + ")", "CONFLICT");
        assertFields(ownCard(), edited);

        finishActivity();
        launch();
        awaitBridge();
        JSONObject reopened = ownCard();
        assertFields(reopened, edited);
        assertEquals(2L, reopened.getLong("revision"));
        assertEquals(updated.getLong("createdAt"), reopened.getLong("createdAt"));
        assertEquals(updated.getLong("updatedAt"), reopened.getLong("updatedAt"));
        openRealCollectionAndCaptureOnlyFixture(fields.getString("name"));

        JSONObject removed = successful(PLUGIN + ".deleteCard(" + new JSONObject().put("id", ownId).put("expectedRevision", 2) + ")");
        assertEquals("Delete must return the native contract's empty object.", 0, removed.length());
        assertEquals(0, lookupOwn().getInt("count"));
        mayHaveCreatedRecord = false;
    }

    @After
    public void removeOnlyThisTestsRecordAndCloseItsActivity() throws Exception {
        if (!authorized) return;
        try {
            if (mayHaveCreatedRecord) {
                if (activity == null) launch();
                awaitBridge();
                JSONObject own = lookupOwn();
                assertTrue("An own-ID collision prevents safe fixture cleanup.", own.getInt("count") <= 1);
                if (own.getInt("count") == 1) {
                    JSONObject saved = own.getJSONObject("card");
                    assertTrue("Cleanup must never target another record.", ownId.equals(saved.getString("id")));
                    successful(PLUGIN + ".deleteCard(" + new JSONObject().put("id", ownId)
                        .put("expectedRevision", saved.getLong("revision")) + ")");
                    assertEquals("The disposable fixture must be removed.", 0, lookupOwn().getInt("count"));
                }
            }
        } finally {
            finishActivity();
        }
    }

    private void launch() {
        Intent intent = new Intent(instrumentation.getTargetContext(), MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity = (MainActivity) instrumentation.startActivitySync(intent);
        instrumentation.waitForIdleSync();
    }

    private void finishActivity() {
        MainActivity current = activity;
        if (current != null) {
            instrumentation.runOnMainSync(current::finish);
            instrumentation.waitForIdleSync();
            activity = null;
        }
    }

    private void awaitBridge() throws Exception {
        long deadline = SystemClock.uptimeMillis() + 30_000;
        while (SystemClock.uptimeMillis() < deadline) {
            JSONObject result = evaluateObject("({ready: Boolean(document.readyState === 'complete'"
                + " && document.getElementById('root') && document.getElementById('root').childElementCount"
                + " && window.Capacitor && window.Capacitor.isPluginAvailable"
                + " && window.Capacitor.isPluginAvailable('CardLensCollection')"
                + " && window.Capacitor.Plugins && window.Capacitor.Plugins.CardLensCollection"
                + " && typeof window.Capacitor.Plugins.CardLensCollection.listCards === 'function')})");
            if (result.optBoolean("ready")) return;
            SystemClock.sleep(100);
        }
        throw new AssertionError("The real packaged app and collection bridge did not become ready.");
    }

    private JSONObject fixtureFields() throws Exception {
        return new JSONObject()
            .put("name", "ピカチュウ").put("setId", JSONObject.NULL)
            .put("setName", "手入力 · Japan").put("cardNumber", "025")
            .put("catalogueCardId", JSONObject.NULL).put("language", "ja")
            .put("variant", "Master Ball").put("condition", "near_mint").put("quantity", 1)
            .put("location", "Emulatorprov · Pärm 1").put("notes", "\n元のメモ\r\n\tBehåll radbrytningar\n");
    }

    private void openRealCollectionAndCaptureOnlyFixture(String name) throws Exception {
        JSONObject safety = successful(PLUGIN + ".listCards().then(function(result) {"
            + "return {onlyOwn: result.cards.length === 1 && result.cards[0].id === " + JSONObject.quote(ownId) + "}; })");
        assertTrue("Refusing a screenshot because records other than this fixture are present.", safety.optBoolean("onlyOwn"));
        JSONObject navigation = evaluateObject("(function() {"
            + "var nav = document.querySelector('nav[aria-label=\"Huvudmeny\"]');"
            + "var button = nav && Array.from(nav.querySelectorAll('button')).find(function(item) {"
            + "return item.textContent.trim() === 'Min samling'; });"
            + "if (!button) return {clicked:false}; button.click(); return {clicked:true}; })()");
        assertTrue("The public collection navigation button was not found.", navigation.optBoolean("clicked"));
        long deadline = SystemClock.uptimeMillis() + 30_000;
        boolean shown = false;
        while (SystemClock.uptimeMillis() < deadline) {
            JSONObject view = evaluateObject("(function() {"
                + "var list = document.querySelector('ul[aria-label=\"Kort i din samling\"]');"
                + "if (!list || list.closest('[hidden]')) return {shown:false};"
                + "var rows = list.querySelectorAll('li');"
                + "if (rows.length !== 1) return {shown:false};"
                + "var heading = rows[0].querySelector('h2');"
                + "if (!heading || heading.textContent !== " + JSONObject.quote(name) + ") return {shown:false};"
                + "rows[0].scrollIntoView({block:'center',behavior:'auto'});"
                + "var bounds = rows[0].getBoundingClientRect();"
                + "return {shown:bounds.height > 0 && bounds.top >= 0 && bounds.bottom <= window.innerHeight}; })()");
            if (view.optBoolean("shown")) { shown = true; break; }
            SystemClock.sleep(100);
        }
        assertTrue("The Japanese fixture did not appear in the real collection UI.", shown);
        instrumentation.waitForIdleSync();
        SystemClock.sleep(250);
        // Capture is permitted only after proving the visible collection contains our one synthetic record.
        Bitmap screenshot = instrumentation.getUiAutomation().takeScreenshot();
        assertTrue("The emulator could not capture its display.", screenshot != null);
        try {
            File directory = instrumentation.getTargetContext().getExternalFilesDir("instrumentation");
            assertTrue("The test screenshot directory is unavailable.", directory != null);
            assertTrue("The test screenshot directory could not be created.", directory.isDirectory() || directory.mkdirs());
            try (FileOutputStream output = new FileOutputStream(new File(directory, "collection-bridge.png"))) {
                assertTrue("The test screenshot could not be encoded.", screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
            }
        } finally {
            screenshot.recycle();
        }
    }

    private void assertFields(JSONObject saved, JSONObject expected) throws Exception {
        assertTrue("The bridge returned another record's identity.", ownId.equals(saved.getString("id")));
        for (Iterator<String> keys = expected.keys(); keys.hasNext();) {
            String key = keys.next();
            assertTrue("A required field was omitted: " + key, saved.has(key));
            assertEquals("A native field changed: " + key, expected.get(key), saved.get(key));
        }
    }

    private JSONObject ownCard() throws Exception {
        JSONObject result = lookupOwn();
        assertEquals("Exactly one test record must be present.", 1, result.getInt("count"));
        return result.getJSONObject("card");
    }

    private JSONObject lookupOwn() throws Exception {
        // The native API lists the collection; only this test's UUID leaves the WebView as test output.
        return successful(PLUGIN + ".listCards().then(function(result) {"
            + "var matches = result.cards.filter(function(card) { return card.id === " + JSONObject.quote(ownId) + "; });"
            + "return {count: matches.length, card: matches.length === 1 ? matches[0] : null}; })");
    }

    private JSONObject successful(String expression) throws Exception {
        JSONObject result = call(expression);
        assertTrue("The native operation failed with code: " + result.optString("code", "UNKNOWN"), result.optBoolean("ok"));
        return result.getJSONObject("value");
    }

    private void expectCode(String expression, String expected) throws Exception {
        JSONObject result = call(expression);
        assertFalse("The stale or conflicting operation must be rejected.", result.optBoolean("ok"));
        assertEquals(expected, result.getString("code"));
    }

    private JSONObject call(String expression) throws Exception {
        String key = JSONObject.quote("__cardLensBridgeTest_" + UUID.randomUUID().toString().replace("-", ""));
        evaluateObject("(function() { window[" + key + "] = {done:false};"
            + "Promise.resolve().then(function() { return " + expression + "; })"
            + ".then(function(value) { window[" + key + "] = {done:true,ok:true,value:value}; },"
            + "function(error) { window[" + key + "] = {done:true,ok:false,"
            + "code:error && typeof error.code === 'string' ? error.code : 'UNKNOWN'}; });"
            + "return {started:true}; })()");
        long deadline = SystemClock.uptimeMillis() + 30_000;
        while (SystemClock.uptimeMillis() < deadline) {
            JSONObject result = evaluateObject("(function() { var result = window[" + key + "] || {done:false};"
                + "if (result.done) delete window[" + key + "]; return result; })()");
            if (result.optBoolean("done")) return result;
            SystemClock.sleep(100);
        }
        // No callback is interpreted as success. @After only removes our UUID if it was persisted.
        throw new AssertionError("The native bridge operation did not return within its deadline.");
    }

    private JSONObject evaluateObject(String expression) throws Exception {
        CountDownLatch callback = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        AtomicReference<RuntimeException> failure = new AtomicReference<>();
        instrumentation.runOnMainSync(() -> {
            try {
                activity.getBridge().getWebView().evaluateJavascript("JSON.stringify((" + expression + "))", value -> {
                    result.set(value);
                    callback.countDown();
                });
            } catch (RuntimeException error) {
                failure.set(error);
                callback.countDown();
            }
        });
        assertTrue("The WebView JavaScript callback timed out.", callback.await(10, TimeUnit.SECONDS));
        assertTrue("The packaged WebView could not evaluate the test expression.", failure.get() == null);
        assertTrue("The WebView returned no JavaScript result.", result.get() != null);
        Object json = new JSONTokener(result.get()).nextValue();
        assertTrue("The WebView result was not a serialized JSON object.", json instanceof String);
        return new JSONObject((String) json);
    }
}
