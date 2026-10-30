sap.ui.define([], function () {
    "use strict";

    return {
        resolveNumberText: function (vPrimary, vAlternate) {
            var vSource = vPrimary;
            if (vSource == null || String(vSource).trim() === "") {
                vSource = vAlternate;
            }

            return this.toNumericText(vSource);
        },
        toNumericText: function (vValue) {
            var sValue = String(vValue == null ? "" : vValue).trim();
            var sDigits = sValue.replace(/[^0-9]/g, "");
            return sDigits;
        }
    };
});
