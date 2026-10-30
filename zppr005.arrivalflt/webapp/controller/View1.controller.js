sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/SelectDialog",
    "sap/m/StandardListItem"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, SelectDialog, StandardListItem) => {
    "use strict";

    const DEFAULT_PAGE_SIZE = 16;
    const DEFAULT_PAGE_INTERVAL = 15;

    return Controller.extend("com.cathaydining.zppr005.arrivalflt.controller.Filter", {
        onInit() {
            this.getView().setModel(new JSONModel({
                AirlineGrp: "",
                PageSize: DEFAULT_PAGE_SIZE,
                PageInterval: DEFAULT_PAGE_INTERVAL
            }), "filter");
        },

        onValueHelpRequest() {
            if (!this._oAirlineGrpDialog) {
                this._oAirlineGrpDialog = new SelectDialog({
                    title: this._getText("filterValueHelpTitle"),
                    items: {
                        path: "/ZI_PP_AIRLINEGRP_VH",
                        template: new StandardListItem({
                            title: "{AirlineGrp}"
                        })
                    },
                    search: this.onValueHelpSearch.bind(this),
                    confirm: this.onValueHelpConfirm.bind(this),
                    cancel: this.onValueHelpClose.bind(this)
                });
                this.getView().addDependent(this._oAirlineGrpDialog);
            }

            this._oAirlineGrpDialog.setModel(this.getOwnerComponent().getModel());
            this._oAirlineGrpDialog.open();
        },

        onValueHelpSearch(oEvent) {
            const sValue = oEvent.getParameter("value") || "";
            const oBinding = oEvent.getSource().getBinding("items");

            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter(new Filter("AirlineGrp", FilterOperator.Contains, sValue));
        },

        onValueHelpConfirm(oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");

            if (!oSelectedItem) {
                return;
            }

            this.getView().getModel("filter").setProperty("/AirlineGrp", oSelectedItem.getTitle());
        },

        onValueHelpClose() {
            return;
        },

        onExecute() {
            const oFilterModel = this.getView().getModel("filter");
            const sAirlineGrp = oFilterModel.getProperty("/AirlineGrp");
            const iPageSize = this._normalizePositiveInteger(oFilterModel.getProperty("/PageSize"), DEFAULT_PAGE_SIZE);
            const iPageInterval = this._normalizePositiveInteger(oFilterModel.getProperty("/PageInterval"), DEFAULT_PAGE_INTERVAL);

            if (!sAirlineGrp) {
                MessageToast.show(this._getText("filterValidationAirlineGrp"));
                return;
            }

            oFilterModel.setProperty("/PageSize", iPageSize);
            oFilterModel.setProperty("/PageInterval", iPageInterval);

            this.getOwnerComponent().getRouter().navTo("RouteView1", {
                "?query": {
                    AirlineGrp: sAirlineGrp,
                    PageSize: iPageSize,
                    PageInterval: iPageInterval
                }
            });
        },

        _normalizePositiveInteger(vValue, iDefaultValue) {
            const iValue = parseInt(vValue, 10);

            if (!Number.isFinite(iValue) || iValue <= 0) {
                return iDefaultValue;
            }

            return iValue;
        },

        _getText(sKey) {
            const oI18nModel = this.getOwnerComponent().getModel("i18n") || this.getView().getModel("i18n");
            return oI18nModel.getResourceBundle().getText(sKey);
        }
    });
});
