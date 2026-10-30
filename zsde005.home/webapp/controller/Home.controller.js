sap.ui.define([
    "sap/ui/core/mvc/Controller"
], (Controller) => {
    "use strict";

    return Controller.extend("com.cathaydining.zsde005.home.controller.Home", {
        onInit() {},

        onMenuPress(oEvent) {
            const oSource = oEvent.getSource();
            const sSemanticObject = oSource && oSource.data && oSource.data("semanticObject");
            const sAction = oSource && oSource.data && oSource.data("action");

            if (!sSemanticObject || !sAction) {
                return;
            }

            const sHash = `#${encodeURIComponent(sSemanticObject)}-${encodeURIComponent(sAction)}`;

            try {
                if (sap.ushell && sap.ushell.Container) {
                    const oCrossAppNav = sap.ushell.Container.getService("CrossApplicationNavigation");
                    if (oCrossAppNav && oCrossAppNav.toExternal) {
                        oCrossAppNav.toExternal({
                            target: {
                                semanticObject: sSemanticObject,
                                action: sAction
                            },
                            params: undefined
                        });
                        return;
                    }
                }
            } catch (e) {
                // ignore and fallback
            }

            window.location.hash = sHash;
        }
    });
});