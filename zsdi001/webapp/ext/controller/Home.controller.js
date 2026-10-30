sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/HashChanger"
], function (Controller, HashChanger) {
    "use strict";

    return Controller.extend("com.cathaydining.zsdi001.ext.controller.Home", {

        onExecute: function () {
            var oRadioGroup = this.byId("optionGroup");
            var iSelectedIndex = oRadioGroup.getSelectedIndex();

            var sHash;
            if (iSelectedIndex === 0) {
                sHash = "material";
            } else if (iSelectedIndex === 1) {
                sHash = "load_temp";
            }

            if (sHash) {
                var oHashChanger = HashChanger.getInstance();
                oHashChanger.setHash(sHash);
            }
        }
    });
});
