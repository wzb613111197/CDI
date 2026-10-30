sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/fe/core/controllerextensions/Routing",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/TableSelectDialog",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/ui/core/ComponentContainer",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Lib"
], function (ControllerExtension, Routing, Fragment, JSONModel, MessageToast, Filter, FilterOperator, Sorter, TableSelectDialog, Column, ColumnListItem, Text, Dialog, Button, ComponentContainer, BusyIndicator, Lib) {
    "use strict";

    return ControllerExtension.extend("com.cathaydining.zppe021.ext.controller.ObjectPageExtension", {
        override: {
            routing: {
                onAfterBinding: function (oBindingContext) {

                }
            },
            onPageReady: function () {
                var oContext = this.base.getView().getBindingContext();
                if (!oContext) return;
                var sEditMode = this.base.getView().getModel("ui").getProperty("/editMode");
                var sType = oContext.getProperty("FlightOrderType");
                if (sEditMode === "Editable" && sType === "FO02") {
                    this._setFieldsReadOnly();
                    this._setMealOrderCDIAppQtyReadOnly();
                }
            }
        },



        _aFO02ReadOnlyFields: [
            "HandleType",
            "DestinationArea",
            "HaulType",
            "WeekDay",
            "WetLeaseFlg",
            "AircraftOwner",
            "FlightOrderType",
            "FlightOrderNum",
            "ColdRoomNum",
            "ColdRoomDate",
            "ColdRoomTime",
            "LoadingBayDate",
            "LoadingBayTime",
            "ZLastReceiveDate",
            "ZLastReceiveTime",
            "FlOrdVersion",
            "GenFlightVersion",
            "SDD",
            "STD_H",
            "EDD",
            "ETD",
            "ATD_date",
            "ATD_time",
            "UTCOffset",
            "InbAirline",
            "InbFlightNum",
            "InbSchArrivalDate",
            "InbSchArrivalTime",
            "InbEstArrivalDate",
            "InbEstArrivalTime",
            "InbActArrivalDate",
            "InbActArrivalTime",
            "InbOrigin",
            "InbDestination",
            "OnwardAirline",
            "OnwardFlightNum"
        ],

        _aFO02ReadOnlyTables: ["_FlOrdItem", "_FlOrdDis", "_FlOrdBill"],

        _aFO02ReadOnlyTableFields: [
            { table: "_FlOrdLD", field: "LoadingDefDescrip" },
            { table: "_FlOrdMas", field: "LoadingDefDescrip" },
            { table: "_FlOrdMas", field: "LoadingTemplateName" },
            { table: "_FlOrdMas", field: "CabinClass" },
            { table: "_FlOrdMas", field: "CycleMethodCd" },
            { table: "_FlOrdMas", field: "CycleNum" },
            { table: "_FlOrdMas", field: "DistMethodCd" },
            { table: "_FlOrdMas", field: "Quantity" },
            { table: "_FlOrdLL",  field: "LoadingTemplateName" },
            { table: "_MealOrder",  field: "InterfaceQty" }
            
        ],

        _setFieldsReadOnly: function () {
            var that = this;

            this._applyFormFieldsReadOnly();

            this._aFO02ReadOnlyTables.forEach(function (sNav) {
                that._setTableReadOnly(sNav);
            });

            this._aFO02ReadOnlyTableFields.forEach(function (oConf) {
                that._setTableFieldReadOnly(oConf.table, oConf.field);
            });
        },

        _applyFormFieldsReadOnly: function () {
            var oView = this.base.getView();
            this._aFO02ReadOnlyFields.forEach(function (sFieldName) {
                var aControls = oView.findAggregatedObjects(true, function (oEl) {
                    var sId = oEl.getId();
                    return sId.indexOf("DataField::" + sFieldName + "::Field") > -1;
                });
                aControls.forEach(function (oControl) {
                    if (oControl.setEditable) {
                        oControl.setEditable(false);
                    }
                });
            });
        },

        _setTableReadOnly: function (sNavProperty) {
            var oView = this.base.getView();
            var sFlag = "_bTableListenerAttached_" + sNavProperty;
            var that = this;

            var oTable = null;
            var sEventName = "";

            var aGridTables = oView.findAggregatedObjects(true, function (oEl) {
                return oEl.isA && oEl.isA("sap.ui.table.Table") && oEl.getId().indexOf(sNavProperty) > -1;
            });
            if (aGridTables.length > 0) {
                oTable = aGridTables[0];
                sEventName = "rowsUpdated";
            } else {
                var aRespTables = oView.findAggregatedObjects(true, function (oEl) {
                    return oEl.isA && oEl.isA("sap.m.Table") && oEl.getId().indexOf(sNavProperty) > -1;
                });
                if (aRespTables.length > 0) {
                    oTable = aRespTables[0];
                    sEventName = "updateFinished";
                }
            }

            if (oTable) {
                var fnSetReadOnly = function () {
                    var aFields = oTable.findAggregatedObjects(true, function (oEl) {
                        return oEl.setEditable;
                    });
                    aFields.forEach(function (oField) {
                        oField.setEditable(false);
                    });
                };
                fnSetReadOnly();
                if (!that[sFlag]) {
                    that[sFlag] = true;
                    oTable.attachEvent(sEventName, fnSetReadOnly);
                }
                return true;
            }
            return false;
        },

        _setMealOrderCDIAppQtyReadOnly: function () {
            var oView = this.base.getView();
            var sFlag = "_bMealOrderCDIAppQtyListener";
            var that = this;

            var aMdcTables = oView.findAggregatedObjects(true, function (oEl) {
                return oEl.isA && oEl.isA("sap.ui.mdc.Table") && oEl.getId().indexOf("_MealOrder") > -1;
            });
            if (aMdcTables.length === 0) return;

            var oMdcTable = aMdcTables[0];
            var aMdcColumns = oMdcTable.getColumns();
            var iColIndex = -1;
            for (var i = 0; i < aMdcColumns.length; i++) {
                if (aMdcColumns[i].getId().indexOf("CDIAppQty") > -1) {
                    iColIndex = i;
                    break;
                }
            }
            if (iColIndex === -1) return;

            var aInnerTables = oMdcTable.findAggregatedObjects(true, function (oEl) {
                return oEl.isA && oEl.isA("sap.ui.table.Table");
            });
            if (aInnerTables.length === 0) return;

            var oInnerTable = aInnerTables[0];
            var fnSetReadOnly = function () {
                var aRows = oInnerTable.getRows();
                aRows.forEach(function (oRow) {
                    var oRowContext = oRow.getBindingContext();
                    if (!oRowContext) return;
                    var sAirlineGroup = oRowContext.getProperty("AirlineGroup");
                    if (sAirlineGroup === "CX") {
                        var aCells = oRow.getCells();
                        if (aCells[iColIndex]) {
                            if (aCells[iColIndex].setEditable) {
                                aCells[iColIndex].setEditable(false);
                            }
                            if (aCells[iColIndex].findAggregatedObjects) {
                                aCells[iColIndex].findAggregatedObjects(true, function (oEl) {
                                    return oEl.setEditable;
                                }).forEach(function (oEl) {
                                    oEl.setEditable(false);
                                });
                            }
                        }
                    }
                });
            };
            fnSetReadOnly();
            if (!that[sFlag]) {
                that[sFlag] = true;
                oInnerTable.attachEvent("rowsUpdated", fnSetReadOnly);
            }
        },

        _setTableFieldReadOnly: function (sNavProperty, sFieldName) {
            var oView = this.base.getView();
            var sFlag = "_bTableFieldListener_" + sNavProperty + "_" + sFieldName;
            var that = this;

            var aMdcTables = oView.findAggregatedObjects(true, function (oEl) {
                return oEl.isA && oEl.isA("sap.ui.mdc.Table") && oEl.getId().indexOf(sNavProperty) > -1;
            });
            if (aMdcTables.length === 0) return;

            var oMdcTable = aMdcTables[0];
            var aMdcColumns = oMdcTable.getColumns();
            var iColIndex = -1;
            for (var i = 0; i < aMdcColumns.length; i++) {
                if (aMdcColumns[i].getId().indexOf(sFieldName) > -1) {
                    iColIndex = i;
                    break;
                }
            }
            if (iColIndex === -1) return;

            var aInnerTables = oMdcTable.findAggregatedObjects(true, function (oEl) {
                return oEl.isA && oEl.isA("sap.ui.table.Table");
            });
            if (aInnerTables.length === 0) return;

            var oInnerTable = aInnerTables[0];
            var fnSetReadOnly = function () {
                var aRows = oInnerTable.getRows();
                aRows.forEach(function (oRow) {
                    var aCells = oRow.getCells();
                    if (aCells[iColIndex]) {
                        if (aCells[iColIndex].setEditable) {
                            aCells[iColIndex].setEditable(false);
                        }
                        if (aCells[iColIndex].findAggregatedObjects) {
                            aCells[iColIndex].findAggregatedObjects(true, function (oEl) {
                                return oEl.setEditable;
                            }).forEach(function (oEl) {
                                oEl.setEditable(false);
                            });
                        }
                    }
                });
            };
            fnSetReadOnly();
            if (!that[sFlag]) {
                that[sFlag] = true;
                oInnerTable.attachEvent("rowsUpdated", fnSetReadOnly);
            }
        },


        onRetrieveLoadingDefinition: function () {
            var oBindingContext = this.base.getView().getBindingContext();
            this.base.getExtensionAPI().getEditFlow().invokeAction(
                "com.sap.gateway.srvd.zsd_pp_manage_flight_order.v0001.GenerateLD",
                {
                    contexts: oBindingContext
                }
            ).then(function () {
                MessageToast.show("Success");
            }).catch(function (oError) {
                MessageToast.show("Error: " + oError.message);
            });
        },

        onRetrieveLoadingTemplate: function () {
            var oBindingContext = this.base.getView().getBindingContext();
            this.base.getExtensionAPI().getEditFlow().invokeAction(
                "com.sap.gateway.srvd.zsd_pp_manage_flight_order.v0001.GenerateMas",
                {
                    contexts: oBindingContext
                }
            ).then(function () {
                MessageToast.show("Success");
            }).catch(function (oError) {
                MessageToast.show("Error: " + oError.message);
            });
        },


        onRetrieveLoadingList: function () {
            var oBindingContext = this.base.getView().getBindingContext();
            this.base.getExtensionAPI().getEditFlow().invokeAction(
                "com.sap.gateway.srvd.zsd_pp_manage_flight_order.v0001.GenerateLL",
                {
                    contexts: oBindingContext
                }
            ).then(function () {
                MessageToast.show("Success");
            }).catch(function (oError) {
                MessageToast.show("Error: " + oError.message);
            });
        },


        onRefreshMaterialList: function () {
            var oBindingContext = this.base.getView().getBindingContext();
            this.base.getExtensionAPI().getEditFlow().invokeAction(
                "com.sap.gateway.srvd.zsd_pp_manage_flight_order.v0001.GenerateItem",
                {
                    contexts: oBindingContext
                }
            ).then(function () {
                MessageToast.show("Success");
            }).catch(function (oError) {
                MessageToast.show("Error: " + oError.message);
            });
        },


        onRefreshDistributionResult: function () {
            var oBindingContext = this.base.getView().getBindingContext();
            this.base.getExtensionAPI().getEditFlow().invokeAction(
                "com.sap.gateway.srvd.zsd_pp_manage_flight_order.v0001.GenerateDis",
                {
                    contexts: oBindingContext
                }
            ).then(function () {
                MessageToast.show("Success");
            }).catch(function (oError) {
                MessageToast.show("Error: " + oError.message);
            });
        },

        /**
         * Opens the standard attachment reuse component for a FlOrdDocu row.
         * View-only: objectType LDGTEMP_DI, objectKey DitId, mode D.
         */
        onOpenAttachment: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext();
            if (!oCtx) {
                return;
            }

            var sDitId = oCtx.getProperty("DitId");
            if (!sDitId) {
                return;
            }

            var oResourceBundle = this.base.getView().getModel("i18n").getResourceBundle();

            if (this._oAttDialog) {
                this._oAttDialog.destroy();
                this._oAttDialog = null;
            }

            var that = this;
            BusyIndicator.show(0);
            Lib.load({ name: "sap.se.mi.plm.lib.attachmentservice" }).then(function () {
                BusyIndicator.hide();
                var oComponentContainer = new ComponentContainer({
                    name: "sap.se.mi.plm.lib.attachmentservice.attachment.components.fscomponent",
                    settings: {
                        mode: "D",
                        objectType: "LDGTEMP_DI",
                        objectKey: sDitId,
                        isGuid: true,
                        isDraft: false
                    },
                    async: true,
                    componentCreated: function (oCreatedEvent) {
                        that._applyAttachmentAttributes(oCreatedEvent.getParameter("component"));
                    }
                });

                that._oAttDialog = new Dialog({
                    title: oResourceBundle.getText("Attachments"),
                    contentWidth: "100rem",
                    contentHeight: "30rem",
                    resizable: true,
                    draggable: true,
                    content: [oComponentContainer],
                    endButton: new Button({
                        text: oResourceBundle.getText("Close"),
                        press: function () {
                            that._oAttDialog.close();
                        }
                    }),
                    afterClose: function () {
                        that._oAttDialog.destroy();
                        that._oAttDialog = null;
                    }
                });

                that._oAttDialog.open();
            }).catch(function (oErr) {
                BusyIndicator.hide();
                MessageToast.show(oResourceBundle.getText("AttachmentServiceLoadFailed") + " " + (oErr.message || oErr));
            });
        },

        _applyAttachmentAttributes: function (oAttComp) {
            if (!oAttComp || !oAttComp.getAttributes) {
                return;
            }

            var aVisibleAttributes = [
                "UPLOADEDBY", "UPLOADEDON", "FILESIZE", "ENABLELINK",
                "ATTACHMENTSTATUS", "ATTACHMENTTITLE", "SOURCE", "DIRDETAILS"
            ];
            // View only: allow download, hide mutate actions
            var aVisibleActions = ["DOWNLOAD"];

            var fnApply = function () {
                var oAttributes = oAttComp.getAttributes();
                if (!oAttributes) {
                    return;
                }
                Object.keys(oAttributes._VisibleAttributes || {}).forEach(function (sKey) {
                    oAttributes._VisibleAttributes[sKey] = aVisibleAttributes.indexOf(sKey) !== -1;
                });
                Object.keys(oAttributes._VisibleActions || {}).forEach(function (sKey) {
                    oAttributes._VisibleActions[sKey] = aVisibleActions.indexOf(sKey) !== -1;
                });
                oAttComp.setAttributes(oAttributes);
            };

            fnApply();

            try {
                var oInnerModel = oAttComp.getRootControl().getController().oModel;
                if (oInnerModel && oInnerModel.attachBatchRequestCompleted) {
                    oInnerModel.attachBatchRequestCompleted(fnApply);
                }
            } catch (oError) {
                MessageToast.show(oError.message);
            }
        }

    });
});
