package com.robertbajo.cardlens.collection;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "CardLensCollection")
public class CardLensCollectionPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor(
        runnable -> new Thread(runnable, "cardlens-collection")
    );
    private final AtomicBoolean destroyed = new AtomicBoolean(false);
    private CollectionDatabase database;
    private CollectionStore store;

    private CollectionStore store() {
        if (store == null) {
            database = CollectionDatabase.open(getContext(), CollectionDatabase.DATABASE_NAME);
            store = new CollectionStore(database, System::currentTimeMillis);
        }
        return store;
    }

    @PluginMethod
    public void listCards(PluginCall call) {
        submit(call, () -> {
            JSONArray result = new JSONArray();
            for (CollectionCard card : store().listCards()) result.put(cardJson(card));
            return new JSObject().put("cards", result);
        });
    }

    @PluginMethod
    public void createCard(PluginCall call) {
        submit(call, () -> {
            String id = CollectionFields.id(call.getData().opt("id"));
            CollectionFields fields = CollectionFields.parse(call.getData().opt("fields"));
            return new JSObject().put("card", cardJson(store().createCard(id, fields)));
        });
    }

    @PluginMethod
    public void updateCard(PluginCall call) {
        submit(call, () -> {
            String id = CollectionFields.id(call.getData().opt("id"));
            long revision = CollectionFields.revision(call.getData().opt("expectedRevision"));
            CollectionFields fields = CollectionFields.parse(call.getData().opt("fields"));
            return new JSObject().put("card", cardJson(store().updateCard(id, revision, fields)));
        });
    }

    @PluginMethod
    public void deleteCard(PluginCall call) {
        submit(call, () -> {
            String id = CollectionFields.id(call.getData().opt("id"));
            long revision = CollectionFields.revision(call.getData().opt("expectedRevision"));
            store().deleteCard(id, revision);
            return new JSObject();
        });
    }

    private interface Operation { JSObject run(); }

    private void submit(PluginCall call, Operation operation) {
        if (destroyed.get()) {
            reject(call, CollectionFailure.storage());
            return;
        }
        try {
            executor.execute(() -> {
                try {
                    call.resolve(operation.run());
                } catch (CollectionFailure error) {
                    reject(call, error);
                } catch (RuntimeException error) {
                    reject(call, CollectionFailure.storage());
                }
            });
        } catch (RejectedExecutionException error) {
            reject(call, CollectionFailure.storage());
        }
    }

    private static void reject(PluginCall call, CollectionFailure error) {
        // Passing a cause to Capacitor reject would log the private underlying exception.
        call.reject(error.getMessage(), error.code);
    }

    static JSObject cardJson(CollectionCard card) {
        return new JSObject()
            .put("id", card.id).put("name", card.name)
            .put("setId", card.setId == null ? JSONObject.NULL : card.setId)
            .put("setName", card.setName).put("cardNumber", card.cardNumber)
            .put("catalogueCardId", card.catalogueCardId == null ? JSONObject.NULL : card.catalogueCardId)
            .put("language", card.language).put("variant", card.variant).put("condition", card.condition)
            .put("quantity", card.quantity).put("location", card.location).put("notes", card.notes)
            .put("createdAt", (Object) card.createdAt).put("updatedAt", (Object) card.updatedAt)
            .put("revision", (Object) card.revision);
    }

    @Override
    protected void handleOnDestroy() {
        if (destroyed.compareAndSet(false, true)) {
            // Finish accepted transactions, then close on the same serial worker; never interrupt a write.
            executor.execute(() -> { if (database != null) database.close(); });
            executor.shutdown();
        }
    }
}
