package com.robertbajo.cardlens.collection;

/** Only static, non-private error details cross the native bridge. */
final class CollectionFailure extends RuntimeException {
    final String code;

    private CollectionFailure(String code, String message) {
        super(message);
        this.code = code;
    }

    static CollectionFailure validation() {
        return new CollectionFailure("VALIDATION", "Kortuppgifterna är inte giltiga.");
    }

    static CollectionFailure conflict() {
        return new CollectionFailure("CONFLICT", "Kortet har ändrats. Läs in samlingen igen.");
    }

    static CollectionFailure notFound() {
        return new CollectionFailure("NOT_FOUND", "Kortet finns inte längre i samlingen.");
    }

    static CollectionFailure storage() {
        return new CollectionFailure("STORAGE_UNAVAILABLE", "Samlingen kunde inte öppnas eller sparas.");
    }
}
