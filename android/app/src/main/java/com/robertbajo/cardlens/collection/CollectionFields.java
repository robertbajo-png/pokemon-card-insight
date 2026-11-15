package com.robertbajo.cardlens.collection;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.json.JSONObject;

final class CollectionFields {
    static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    private static final Pattern ID = Pattern.compile(
        "^(?:card-)?[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    );
    private static final Set<String> KEYS = new HashSet<>(Arrays.asList(
        "name", "setId", "setName", "cardNumber", "catalogueCardId", "language",
        "variant", "condition", "quantity", "location", "notes"
    ));
    private static final Set<String> LANGUAGES = new HashSet<>(Arrays.asList(
        "en", "ja", "sv", "de", "fr", "es", "it", "pt", "ko", "zh", "other", "unknown"
    ));
    private static final Set<String> CONDITIONS = new HashSet<>(Arrays.asList(
        "unknown", "mint", "near_mint", "lightly_played", "moderately_played", "heavily_played", "damaged"
    ));

    final String name;
    final String setId;
    final String setName;
    final String cardNumber;
    final String catalogueCardId;
    final String language;
    final String variant;
    final String condition;
    final int quantity;
    final String location;
    final String notes;

    private CollectionFields(JSONObject input) {
        if (input == null || input.length() != KEYS.size()) throw CollectionFailure.validation();
        for (String key : KEYS) if (!input.has(key)) throw CollectionFailure.validation();
        name = human(input.opt("name"), 1, 120);
        setId = opaque(input.opt("setId"), 128);
        setName = human(input.opt("setName"), 0, 120);
        cardNumber = human(input.opt("cardNumber"), 0, 40);
        catalogueCardId = opaque(input.opt("catalogueCardId"), 160);
        language = enumeration(input.opt("language"), LANGUAGES);
        variant = human(input.opt("variant"), 0, 80);
        condition = enumeration(input.opt("condition"), CONDITIONS);
        quantity = (int) integer(input.opt("quantity"), 1, 9999);
        location = human(input.opt("location"), 0, 120);
        notes = rawString(input.opt("notes"), 2000, true);
    }

    static CollectionFields parse(Object value) {
        if (!(value instanceof JSONObject)) throw CollectionFailure.validation();
        return new CollectionFields((JSONObject) value);
    }

    static String id(Object value) {
        if (!(value instanceof String) || !ID.matcher((String) value).matches()) {
            throw CollectionFailure.validation();
        }
        return (String) value;
    }

    static long revision(Object value) {
        return integer(value, 1, MAX_SAFE_INTEGER);
    }

    private static long integer(Object value, long min, long max) {
        if (!(value instanceof Number)) throw CollectionFailure.validation();
        double numeric = ((Number) value).doubleValue();
        if (!Double.isFinite(numeric) || numeric != Math.rint(numeric) || numeric < min || numeric > max) {
            throw CollectionFailure.validation();
        }
        return (long) numeric;
    }

    private static String human(Object value, int min, int max) {
        if (!(value instanceof String)) throw CollectionFailure.validation();
        String text = trimLikeJavaScript((String) value);
        if (text.length() < min) throw CollectionFailure.validation();
        return rawString(text, max, false);
    }

    private static String opaque(Object value, int max) {
        if (value == JSONObject.NULL) return null;
        String text = rawString(value, max, false);
        if (trimLikeJavaScript(text).isEmpty()) throw CollectionFailure.validation();
        return text;
    }

    private static String enumeration(Object value, Set<String> allowed) {
        if (!(value instanceof String) || !allowed.contains(value)) throw CollectionFailure.validation();
        return (String) value;
    }

    private static String rawString(Object value, int max, boolean notes) {
        if (!(value instanceof String)) throw CollectionFailure.validation();
        String text = (String) value;
        if (text.length() > max) throw CollectionFailure.validation();
        for (int i = 0; i < text.length(); i++) {
            char ch = text.charAt(i);
            if (Character.isISOControl(ch) && !(notes && (ch == '\t' || ch == '\n' || ch == '\r'))) {
                throw CollectionFailure.validation();
            }
        }
        return text;
    }

    // String.trim() misses NBSP/FEFF and strips extra controls; mirror JS String.trim instead.
    static String trimLikeJavaScript(String text) {
        int first = 0;
        int last = text.length();
        while (first < last && trimCharacter(text.charAt(first))) first++;
        while (last > first && trimCharacter(text.charAt(last - 1))) last--;
        return text.substring(first, last);
    }

    private static boolean trimCharacter(char ch) {
        return (ch >= '\t' && ch <= '\r') || ch == ' ' || ch == '\u00a0'
            || ch == '\u1680' || (ch >= '\u2000' && ch <= '\u200a') || ch == '\u2028'
            || ch == '\u2029' || ch == '\u202f' || ch == '\u205f' || ch == '\u3000' || ch == '\ufeff';
    }

    void applyTo(CollectionCard card) {
        card.name = name;
        card.setId = setId;
        card.setName = setName;
        card.cardNumber = cardNumber;
        card.catalogueCardId = catalogueCardId;
        card.language = language;
        card.variant = variant;
        card.condition = condition;
        card.quantity = quantity;
        card.location = location;
        card.notes = notes;
    }

    boolean matches(CollectionCard card) {
        return name.equals(card.name) && Objects.equals(setId, card.setId) && setName.equals(card.setName)
            && cardNumber.equals(card.cardNumber) && Objects.equals(catalogueCardId, card.catalogueCardId)
            && language.equals(card.language) && variant.equals(card.variant) && condition.equals(card.condition)
            && quantity == card.quantity && location.equals(card.location) && notes.equals(card.notes);
    }
}
