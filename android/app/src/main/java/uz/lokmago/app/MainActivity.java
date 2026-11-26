package uz.lokmago.app;

import android.os.Bundle;
import android.view.View;
import android.view.animation.DecelerateInterpolator;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Ishga tushirish ekrani (tema: AppTheme.NoActionBarLaunch) — super.onCreate'dan OLDIN
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        // Mavsumiy ikonka plagini (super.onCreate'dan OLDIN ro'yxatdan o'tkaziladi)
        registerPlugin(AppIconPlugin.class);
        super.onCreate(savedInstanceState);

        // Native ekran qattiq uzilib emas, 250 ms yumshoq so'nib ketadi; ostida veb-Splash xuddi shu kadr bilan turibdi
        splash.setOnExitAnimationListener(provider -> {
            final View view = provider.getView();
            view.animate()
                .alpha(0f)
                .setDuration(250)
                .setInterpolator(new DecelerateInterpolator())
                .withEndAction(provider::remove)
                .start();
        });
    }
}
