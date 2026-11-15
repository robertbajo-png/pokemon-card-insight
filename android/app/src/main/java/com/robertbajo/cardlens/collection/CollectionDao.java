package com.robertbajo.cardlens.collection;

import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import java.util.List;

@Dao
public interface CollectionDao {
    @Query("SELECT * FROM collection_cards ORDER BY updatedAt DESC, createdAt DESC, id ASC")
    List<CollectionCard> listCards();

    @Query("SELECT * FROM collection_cards WHERE id = :id LIMIT 1")
    CollectionCard find(String id);

    @Insert(onConflict = OnConflictStrategy.ABORT)
    void insert(CollectionCard card);

    @Query("UPDATE collection_cards SET name=:name, setId=:setId, setName=:setName, "
        + "cardNumber=:cardNumber, catalogueCardId=:catalogueCardId, language=:language, "
        + "variant=:variant, condition=:condition, quantity=:quantity, location=:location, "
        + "notes=:notes, updatedAt=:updatedAt, revision=revision+1 WHERE id=:id AND revision=:expectedRevision")
    int update(String id, long expectedRevision, String name, String setId, String setName,
        String cardNumber, String catalogueCardId, String language, String variant, String condition,
        int quantity, String location, String notes, long updatedAt);

    @Query("DELETE FROM collection_cards WHERE id=:id AND revision=:expectedRevision")
    int delete(String id, long expectedRevision);
}
