package com.robertbajo.cardlens.collection;

import android.content.Context;
import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;

@Database(entities = { CollectionCard.class }, version = 1, exportSchema = true)
public abstract class CollectionDatabase extends RoomDatabase {
    static final String DATABASE_NAME = "cardlens-collection.db";

    public abstract CollectionDao cards();

    static CollectionDatabase open(Context context, String name) {
        // No fallbackToDestructiveMigration, recovery, backup or main-thread queries.
        return Room.databaseBuilder(context.getApplicationContext(), CollectionDatabase.class, name)
            .openHelperFactory(new PreservingOpenHelperFactory())
            .setJournalMode(JournalMode.TRUNCATE)
            .build();
    }
}
