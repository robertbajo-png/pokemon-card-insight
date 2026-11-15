package com.robertbajo.cardlens;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.robertbajo.cardlens.collection.CardLensCollectionPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CardLensCollectionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
