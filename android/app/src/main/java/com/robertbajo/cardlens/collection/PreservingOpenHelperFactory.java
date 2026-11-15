package com.robertbajo.cardlens.collection;

import android.database.sqlite.SQLiteDatabaseCorruptException;
import androidx.sqlite.db.SupportSQLiteDatabase;
import androidx.sqlite.db.SupportSQLiteOpenHelper;
import androidx.sqlite.db.framework.FrameworkSQLiteOpenHelperFactory;

/** Never use Android's default corruption callback, which may delete the database. */
final class PreservingOpenHelperFactory implements SupportSQLiteOpenHelper.Factory {
    @Override
    public SupportSQLiteOpenHelper create(SupportSQLiteOpenHelper.Configuration configuration) {
        SupportSQLiteOpenHelper.Callback delegate = configuration.callback;
        SupportSQLiteOpenHelper.Callback preserving = new SupportSQLiteOpenHelper.Callback(delegate.version) {
            @Override public void onConfigure(SupportSQLiteDatabase db) { delegate.onConfigure(db); }
            @Override public void onCreate(SupportSQLiteDatabase db) { delegate.onCreate(db); }
            @Override public void onUpgrade(SupportSQLiteDatabase db, int oldVersion, int newVersion) {
                delegate.onUpgrade(db, oldVersion, newVersion);
            }
            @Override public void onDowngrade(SupportSQLiteDatabase db, int oldVersion, int newVersion) {
                delegate.onDowngrade(db, oldVersion, newVersion);
            }
            @Override public void onOpen(SupportSQLiteDatabase db) { delegate.onOpen(db); }
            @Override public void onCorruption(SupportSQLiteDatabase db) {
                throw new SQLiteDatabaseCorruptException("Collection database cannot be opened.");
            }
        };
        return new FrameworkSQLiteOpenHelperFactory().create(
            SupportSQLiteOpenHelper.Configuration.builder(configuration.context)
                .name(configuration.name)
                .callback(preserving)
                .noBackupDirectory(configuration.useNoBackupDirectory)
                .allowDataLossOnRecovery(false)
                .build()
        );
    }
}
