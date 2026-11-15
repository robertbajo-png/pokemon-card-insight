package com.robertbajo.cardlens.collection;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.LongSupplier;

final class CollectionStore {
    private final CollectionDatabase database;
    private final CollectionDao cards;
    private final LongSupplier clock;

    CollectionStore(CollectionDatabase database, LongSupplier clock) {
        this.database = database;
        this.cards = database.cards();
        this.clock = clock;
    }

    List<CollectionCard> listCards() {
        return guard(cards::listCards);
    }

    CollectionCard createCard(String id, CollectionFields fields) {
        CollectionFields.id(id);
        return guard(() -> database.runInTransaction((Callable<CollectionCard>) () -> {
            CollectionCard existing = cards.find(id);
            if (existing != null) {
                if (!fields.matches(existing)) throw CollectionFailure.conflict();
                return existing;
            }
            CollectionCard card = new CollectionCard();
            card.id = id;
            fields.applyTo(card);
            card.createdAt = timestamp(0);
            card.updatedAt = card.createdAt;
            card.revision = 1;
            cards.insert(card);
            return card;
        }));
    }

    CollectionCard updateCard(String id, long expectedRevision, CollectionFields fields) {
        CollectionFields.id(id);
        CollectionFields.revision(expectedRevision);
        return guard(() -> database.runInTransaction((Callable<CollectionCard>) () -> {
            CollectionCard existing = requireCard(id, expectedRevision);
            if (existing.revision >= CollectionFields.MAX_SAFE_INTEGER) throw CollectionFailure.storage();
            long updatedAt = timestamp(existing.updatedAt);
            int affected = cards.update(id, expectedRevision, fields.name, fields.setId, fields.setName,
                fields.cardNumber, fields.catalogueCardId, fields.language, fields.variant, fields.condition,
                fields.quantity, fields.location, fields.notes, updatedAt);
            if (affected != 1) throw CollectionFailure.conflict();
            return cards.find(id);
        }));
    }

    void deleteCard(String id, long expectedRevision) {
        CollectionFields.id(id);
        CollectionFields.revision(expectedRevision);
        guard(() -> database.runInTransaction((Callable<Void>) () -> {
            requireCard(id, expectedRevision);
            if (cards.delete(id, expectedRevision) != 1) throw CollectionFailure.conflict();
            return null;
        }));
    }

    private CollectionCard requireCard(String id, long expectedRevision) {
        CollectionCard card = cards.find(id);
        if (card == null) throw CollectionFailure.notFound();
        if (card.revision != expectedRevision) throw CollectionFailure.conflict();
        return card;
    }

    private long timestamp(long previous) {
        long now = Math.max(clock.getAsLong(), previous + 1);
        if (now < 1 || now > CollectionFields.MAX_SAFE_INTEGER) throw CollectionFailure.storage();
        return now;
    }

    private interface Operation<T> { T run(); }

    private static <T> T guard(Operation<T> operation) {
        try {
            return operation.run();
        } catch (CollectionFailure error) {
            throw error;
        } catch (RuntimeException error) {
            // Do not attach the SQL exception, identifiers or private row contents.
            throw CollectionFailure.storage();
        }
    }
}
