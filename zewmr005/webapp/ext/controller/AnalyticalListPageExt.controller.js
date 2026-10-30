sap.ui.define([
    "sap/m/MessageToast"
], function (MessageToast) {
    'use strict';

    return {
        onInit: function () {

        },


        onInitSmartFilterBarExtension: function (oEvent) {
            var SmartFilterBar = oEvent.getSource(),
                oDefaultFilter = { "$Parameter.p_reportdate": new Date() };
            SmartFilterBar.setFilterData(oDefaultFilter);
            // SmartFilterBar.fireSearch();
        },

    }
});
