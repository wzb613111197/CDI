sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/HashChanger"
], function (Controller, HashChanger) {
    "use strict";

    return Controller.extend("com.cathaydining.zsde005.createquo.ext.controller.Home", {

        onExecute: function () {
            var oRadioGroup = this.byId("optionGroup");
            var iSelectedIndex = oRadioGroup.getSelectedIndex();

            var sHash;
            if (iSelectedIndex === 0) {
                sHash = "ZI_SD_QT_MATERIAL";
            } else if (iSelectedIndex === 1) {
                sHash = "ZI_SD_QT_LOAD_TEMP";
            }

            if (sHash) {
                var oHashChanger = HashChanger.getInstance();
                oHashChanger.setHash(sHash);
            }
        }
    });
});
