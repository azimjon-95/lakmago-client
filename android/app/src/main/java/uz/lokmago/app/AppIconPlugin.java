package uz.lokmago.app;

import android.content.ComponentName;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Mavsumiy ilova ikonkasi (Android): AndroidManifest.xml dagi activity-alias'lardan FAQAT BITTASI yoqiladi.
 * JS: registerPlugin('AppIcon') — getCurrent() → { theme }, setIcon({ theme }) → { theme, changed }.
 *
 * Mavzular ro'yxati src/lib/appIconSchedule.js (ICON_THEMES) bilan BIR XIL bo'lishi shart —
 * tests/appIconNative.test.mjs shuni tekshiradi. Alias nomi: uz.lokmago.app.Icon<Mavzu> (masalan IconSpring).
 * DIQQAT: ComponentName paketi — applicationId ("lokma.uz", getPackageName()), klass nomi — namespace ("uz.lokmago.app") bo'yicha.
 */
@CapacitorPlugin(name = "AppIcon")
public class AppIconPlugin extends Plugin {
    static final String[] THEMES = {"default", "spring", "summer", "autumn", "ramadan", "newyear"};
    private static final String ALIAS_PREFIX = "uz.lokmago.app.Icon";

    private ComponentName alias(String theme) {
        String cls = ALIAS_PREFIX + theme.substring(0, 1).toUpperCase() + theme.substring(1);
        return new ComponentName(getContext().getPackageName(), cls);
    }

    private boolean isKnown(String theme) {
        for (String t : THEMES) {
            if (t.equals(theme)) return true;
        }
        return false;
    }

    @PluginMethod
    public void getCurrent(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        String current = "default";
        // Mavsumiy alias aniq yoqilgan bo'lsa — o'sha; aks holda manifestdagi standart (IconDefault, enabled=true)
        for (String t : THEMES) {
            if (t.equals("default")) continue;
            if (pm.getComponentEnabledSetting(alias(t)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED) {
                current = t;
                break;
            }
        }
        JSObject ret = new JSObject();
        ret.put("theme", current);
        call.resolve(ret);
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        String theme = call.getString("theme");
        if (theme == null || !isKnown(theme)) {
            call.reject("Noma'lum mavzu: " + theme);
            return;
        }
        try {
            PackageManager pm = getContext().getPackageManager();
            ComponentName target = alias(theme);
            boolean already = pm.getComponentEnabledSetting(target) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED;
            if (!already) {
                // Avval yangisini yoqamiz, keyin eskilarini o'chiramiz — ikonka bir lahzaga ham yo'qolmaydi.
                // DONT_KILL_APP: ilova yopilib ketmasin.
                pm.setComponentEnabledSetting(target, PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
                for (String t : THEMES) {
                    if (t.equals(theme)) continue;
                    pm.setComponentEnabledSetting(alias(t), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
                }
            }
            JSObject ret = new JSObject();
            ret.put("theme", theme);
            ret.put("changed", !already);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Ikonkani almashtirib bo'lmadi: " + e.getMessage());
        }
    }
}
