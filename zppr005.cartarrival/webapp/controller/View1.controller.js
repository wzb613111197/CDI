sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/TableSelectDialog",
    "sap/m/ColumnListItem",
    "sap/m/Column",
    "sap/m/Text",
    "sap/m/Token"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, TableSelectDialog, ColumnListItem, Column, Text, Token) => {
    "use strict";

    const DEFAULT_PAGE_SIZE = 16;
    const DEFAULT_PAGE_INTERVAL = 15;

    return Controller.extend("com.cathaydining.zppr005.cartarrival.controller.View1", {
        onInit() {
            this.getView().setModel(new JSONModel({
                ColdRooms: [],
                PageSize: DEFAULT_PAGE_SIZE,
                PageInterval: DEFAULT_PAGE_INTERVAL
            }), "filter");
        },

        onValueHelpRequest() {
            if (!this._oColdRoomDialog) {
                this._oColdRoomDialog = new TableSelectDialog({
                    title: this._getText("filterValueHelpTitle"),
                    multiSelect: true,
                    growing: false,
                    contentWidth: "30rem",
                    contentHeight: "30rem",
                    columns: [
                        new Column({
                            header: new Text({ text: this._getText("filterColdRoomColumn") })
                        })
                    ],
                    items: {
                        path: "/ZI_PP_COLD_ROOM_VH",
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{ColdRoom}" })
                            ]
                        })
                    },
                    search: this.onValueHelpSearch.bind(this),
                    confirm: this.onValueHelpConfirm.bind(this),
                    cancel: this.onValueHelpClose.bind(this)
                });
                this.getView().addDependent(this._oColdRoomDialog);
            }

            this._oColdRoomDialog.setModel(this.getOwnerComponent().getModel());
            this._oColdRoomDialog.open();
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

            oBinding.filter(new Filter("ColdRoom", FilterOperator.Contains, sValue));
        },

        onValueHelpConfirm(oEvent) {
            const aSelectedItems = oEvent.getParameter("selectedItems") || [];
            const oFilterModel = this.getView().getModel("filter");
            const aSelected = aSelectedItems.map((oItem) => oItem.getCells()[0].getText());

            oFilterModel.setProperty("/ColdRooms", aSelected);

            const oMultiInput = this.byId("filterColdRoomInput");
            oMultiInput.removeAllTokens();
            aSelected.forEach((sValue) => {
                oMultiInput.addToken(new Token({ key: sValue, text: sValue }));
            });
        },

        onValueHelpClose() {
            return;
        },

        onColdRoomInputChange(oEvent) {
            oEvent.getSource().setValue("");
        },

        onExecute() {
            const oFilterModel = this.getView().getModel("filter");
            const aColdRooms = oFilterModel.getProperty("/ColdRooms");
            const iPageSize = this._normalizePositiveInteger(oFilterModel.getProperty("/PageSize"), DEFAULT_PAGE_SIZE);
            const iPageInterval = this._normalizePositiveInteger(oFilterModel.getProperty("/PageInterval"), DEFAULT_PAGE_INTERVAL);

            if (!aColdRooms || !aColdRooms.length) {
                MessageToast.show(this._getText("filterValidationColdRoom"));
                return;
            }

            oFilterModel.setProperty("/PageSize", iPageSize);
            oFilterModel.setProperty("/PageInterval", iPageInterval);

            this.getOwnerComponent().getRouter().navTo("RouteView2", {
                "?query": {
                    ColdRoom: aColdRooms.join(","),
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