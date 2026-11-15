package com.robertbajo.cardlens.collection;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.room.Entity;
import androidx.room.PrimaryKey;

@Entity(tableName = "collection_cards")
public class CollectionCard {
    @PrimaryKey @NonNull public String id;
    @NonNull public String name;
    @Nullable public String setId;
    @NonNull public String setName;
    @NonNull public String cardNumber;
    @Nullable public String catalogueCardId;
    @NonNull public String language;
    @NonNull public String variant;
    @NonNull public String condition;
    public int quantity;
    @NonNull public String location;
    @NonNull public String notes;
    public long createdAt;
    public long updatedAt;
    public long revision;
}
