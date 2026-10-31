package uz.lokmago.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Mavsumiy ikonka plagini (super.onCreate'dan OLDIN ro'yxatdan o'tkaziladi)
        registerPlugin(AppIconPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
