sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (ControllerExtension, MessageToast, JSONModel) {
    "use strict";

    function buildRowKey(sDatasource, sVbeln, sPosnr) {
        if (!sDatasource || !sVbeln || !sPosnr) {
            return "";
        }

        return [sDatasource, sVbeln, sPosnr].join("_");
    }

    function hasZeroDecimalUnit(sMeins) {
        var aZeroDecimalUnits = ["PC", "EA", "ST", "PCE"];
        return !!sMeins && aZeroDecimalUnits.includes(sMeins.toUpperCase());
    }

    function normalizeQuantityValue(vValue, sMeins) {
        if (vValue === undefined || vValue === null) {
            return "";
        }

        var sCleanString = vValue.toString().replace(/,/g, "").trim();
        if (!sCleanString) {
            return "";
        }

        var fVal = parseFloat(sCleanString);
        if (isNaN(fVal)) {
            return "";
        }

        if (hasZeroDecimalUnit(sMeins)) {
            return fVal.toString();
        }

        return fVal.toFixed(3);
    }

    function getFinalLfimgValue(oChangedRow, oData) {
        var vLfimg = oChangedRow && oChangedRow.lfimg !== undefined ? oChangedRow.lfimg : oData && oData.lfimg;
        return normalizeQuantityValue(vLfimg, oData && oData.meins);
    }

    function hasOwnLfimgChange(oChangedRow) {
        return !!oChangedRow && Object.prototype.hasOwnProperty.call(oChangedRow, "lfimg");
    }

    function getCellValueForRow(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, sFieldName, sMeins) {
        if (!sDatasource || !sVbeln || !sPosnr) {
            return sOriginalValue || "";
        }

        var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
        var sResult = sOriginalValue || "";
        if (oChangedRows && oChangedRows[sKey] && oChangedRows[sKey][sFieldName] !== undefined) {
            sResult = oChangedRows[sKey][sFieldName];
        }

        if (sFieldName === "lfimg") {
            var sNormalizedQuantity = normalizeQuantityValue(sResult, sMeins);
            if (sNormalizedQuantity) {
                return sNormalizedQuantity;
            }
        }

        return sResult;
    }

    return ControllerExtension.extend("com.cathaydining.zewme001.mrcon.ext.controller.ListPageExtention", {
        override: {
            onInit: function () {
                // Create a local JSON model to control the editability
                var oViewModel = new JSONModel({
                    isQuantityEditable: false
                });
                this.base.getView().setModel(oViewModel, "localView");
                
                // Create a local JSON model to store the dynamic Proposed Quantity and other row edits
                var oLocalDataModel = new JSONModel({
                    actionsEnabled: false,
                    proposedQuantities: {},
                    messageTypes: {},
                    messages: {},
                    changedRows: {}
                });
                this.base.getView().setModel(oLocalDataModel, "localData");
            },
            onAfterRendering: function () {
                this._attachFilterBarSearchHandler();

                // Keep the ID matching the one used in the standard view creation
                var oTableAPI = this.base.getView().byId("fe::table::mr_consolidation::LineItem::Table");
                if (!oTableAPI) {
                    // Fallback to ListReport macro pattern if ID is different
                    oTableAPI = this.base.getView().byId(this.base.getView().getId() + "--fe::table::mr_consolidation::LineItem::Table");
                }
                
                if (oTableAPI) {
                    // Try to get content (MDC Table) from the TableAPI
                    var oMDCTable = typeof oTableAPI.getContent === "function" ? oTableAPI.getContent() : null;
                    
                    // If getContent() is not available, try to find MDC Table by its ID directly
                    if (!oMDCTable) {
                        oMDCTable = this.base.getView().byId("fe::table::mr_consolidation::LineItem");
                        if (!oMDCTable) {
                            oMDCTable = this.base.getView().byId(this.base.getView().getId() + "--fe::table::mr_consolidation::LineItem");
                        }
                    }

                    if (oMDCTable && typeof oMDCTable.initialized === "function") {
                        var that = this;
                        oMDCTable.initialized().then(function () {
                            that._applyDefaultSelectAllAndLock(oMDCTable);
                        });
                    }
                }
            },
            routing: {
                onBeforeBinding: function () {
                    this._resetLocalTransientState();
                }
            }
        },

        _attachFilterBarSearchHandler: function () {
            var oView = this.base.getView();
            var oFilterBar = oView.byId("fe::FilterBar::mr_consolidation");

            if (!oFilterBar) {
                oFilterBar = oView.byId(oView.getId() + "--fe::FilterBar::mr_consolidation");
            }

            if (!oFilterBar || typeof oFilterBar.attachSearch !== "function" || oFilterBar.data("localStateResetSearchAttached")) {
                return;
            }

            oFilterBar.attachSearch(this._resetLocalTransientState, this);
            oFilterBar.data("localStateResetSearchAttached", true);
        },

        _applyDefaultSelectAllAndLock: function (oMDCTable) {
            if (!oMDCTable) return;
            
            if (!oMDCTable.data('mdcSelectionHandlersAttached')) {
                if (typeof oMDCTable.attachSelectionChange === "function") {
                    oMDCTable.attachSelectionChange(this._onRowsUpdatedForFixedSelection, this);
                }
                oMDCTable.data('mdcSelectionHandlersAttached', true);
            }
            
            // Wait for the inner grid table to be available
            if (typeof oMDCTable.initialized === "function") {
                oMDCTable.initialized().then(function() {
                    // Try to get inner table safely
                    var oInnerTable = null;
                    
                    if (oMDCTable._oTable) {
                         oInnerTable = oMDCTable._oTable;
                    } else if (typeof oMDCTable.getController === "function" && oMDCTable.getController()._getTable) {
                         oInnerTable = oMDCTable.getController()._getTable();
                    } else {
                         // Fallback brute force: try to find it by ID suffix
                         var sTableId = oMDCTable.getId() + "-innerTable";
                         oInnerTable = sap.ui.getCore().byId(sTableId);
                    }
                    
                    if (!oInnerTable) {
                        return;
                    }
                    
                    if (!oInnerTable.data('fixedSelectionHandlersAttached')) {
                        if (oInnerTable.attachEvent) {
                            // Depending if GridTable (ui.table) or ResponsiveTable (m.Table)
                            if (typeof oInnerTable.attachRowSelectionChange === "function") {
                                oInnerTable.attachRowSelectionChange(this._onRowsUpdatedForFixedSelection, this);
                            } else if (typeof oInnerTable.attachSelectionChange === "function") {
                                oInnerTable.attachSelectionChange(this._onRowsUpdatedForFixedSelection, this);
                            }
                        }
                        oInnerTable.data('fixedSelectionHandlersAttached', true);
                    }
                }.bind(this));
            }
        },

        _onRowsUpdatedForFixedSelection: function (oEvent) {
            var oTable = oEvent.getSource();
            var aSelectedContexts = [];
            
            // Support both ui.table and m.Table selection events
            if (typeof oTable.getSelectedIndices === "function") {
                var aSelectedIndices = oTable.getSelectedIndices();
                for (var i = 0; i < aSelectedIndices.length; i++) {
                    var oContext = oTable.getContextByIndex(aSelectedIndices[i]);
                    if (oContext) aSelectedContexts.push(oContext);
                }
            } else if (typeof oTable.getSelectedContexts === "function") {
                aSelectedContexts = oTable.getSelectedContexts();
            }

            var bDisableActions = false;

            if (aSelectedContexts.length === 0) {
                bDisableActions = true;
            } else {
                for (var j = 0; j < aSelectedContexts.length; j++) {
                    var sStatus = (aSelectedContexts[j].getProperty("status") || "").trim().toUpperCase();
                    var sStatusDesc = (aSelectedContexts[j].getProperty("status_desc") || "").trim().toUpperCase();
                    
                    if (sStatus === "R" || sStatus === "C" || sStatusDesc.indexOf("REJECTED") !== -1 || sStatusDesc.indexOf("COMPLETED") !== -1) {
                        bDisableActions = true;
                        break;
                    }
                }
            }

            var oLocalDataModel = this.base.getView().getModel("localData");
            oLocalDataModel.setProperty("/actionsEnabled", !bDisableActions);
        },

        _buildRowKey: function (sDatasource, sVbeln, sPosnr) {
            return buildRowKey(sDatasource, sVbeln, sPosnr);
        },

        _getRowKeyFromData: function (oData) {
            if (!oData) {
                return "";
            }

            return this._buildRowKey(oData.datasource, oData.vbeln, oData.posnr);
        },

        _resetLocalTransientState: function () {
            var oLocalDataModel = this.base.getView().getModel("localData");
            if (!oLocalDataModel) {
                return;
            }

            oLocalDataModel.setProperty("/proposedQuantities", {});
            oLocalDataModel.setProperty("/messageTypes", {});
            oLocalDataModel.setProperty("/messages", {});
            oLocalDataModel.setProperty("/changedRows", {});
            oLocalDataModel.checkUpdate(true);
            oLocalDataModel.refresh(true);
        },

        getMappedValue: function (oValueMap, sDatasource, sVbeln, sPosnr) {
            if (!oValueMap || !sDatasource || !sVbeln || !sPosnr) {
                return "";
            }

            var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
            return oValueMap[sKey] !== undefined && oValueMap[sKey] !== null ? oValueMap[sKey] : "";
        },

        getProposedQuantity: function (oProposedQuantities, sDatasource, sVbeln, sPosnr, sMeins) {
            if (!oProposedQuantities || !sDatasource || !sVbeln || !sPosnr) {
                return "";
            }
            var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
            var sVal = oProposedQuantities[sKey];
            if (sVal === undefined || sVal === null) {
                return "";
            }
            
            // Format decimals based on unit of measure
            var sCleanString = sVal.toString().replace(/,/g, "");
            var fVal = parseFloat(sCleanString);
            if (isNaN(fVal)) {
                return sVal;
            }
            // Standard discrete units like PC, EA, ST typically have 0 decimals
            var aZeroDecimalUnits = ["PC", "EA", "ST", "PCE"];
            if (sMeins && aZeroDecimalUnits.includes(sMeins.toUpperCase())) {
                return fVal.toString(); // "10"
            }
            
            // For other units like KG, display with 3 decimals
            return fVal.toFixed(3); // "10.000"
        },

        getDeliveryQuantityValue: function(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, sMeins) {
            return getCellValueForRow(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, "lfimg", sMeins);
        },

        getPriorityValue: function(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue) {
            return getCellValueForRow(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, "priority", null);
        },

        getCellValue: function (oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, sFieldName, sMeins) {
            return getCellValueForRow(oChangedRows, sDatasource, sVbeln, sPosnr, sOriginalValue, sFieldName, sMeins);
        },

        _hasInvalidSelectedQuantity: function (aSelectedContexts) {
            var oLocalDataModel = this.base.getView().getModel("localData");

            return aSelectedContexts.some(function (oSelContext) {
                var oData = oSelContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var oChangedRow = oLocalDataModel.getProperty("/changedRows/" + sKey) || {};

                return hasOwnLfimgChange(oChangedRow) && !getFinalLfimgValue(oChangedRow, oData);
            }.bind(this));
        },

        onRowInputModelContextChange: function (oEvent) {
            this._syncRowInputEditableState(oEvent.getSource());
        },

        _syncRowInputEditableState: function (oInput) {
            if (!oInput || typeof oInput.getBindingContext !== "function") {
                return;
            }

            var oContext = oInput.getBindingContext();
            if (!oContext || typeof oContext.getProperty !== "function") {
                if (typeof oInput.setEditable === "function") {
                    oInput.setEditable(false);
                }
                if (typeof oInput.setEnabled === "function") {
                    oInput.setEnabled(false);
                }
                return;
            }

            var sStatus = (oContext.getProperty("status") || "").toString().trim().toUpperCase();
            var sStatusDesc = (oContext.getProperty("status_desc") || "").toString().trim().toUpperCase();
            var bEditable = this.isRowEditable(sStatus, sStatusDesc);

            if (typeof oInput.setEditable === "function") {
                oInput.setEditable(bEditable);
            }
            if (typeof oInput.setEnabled === "function") {
                oInput.setEnabled(bEditable);
            }
        },

        onProposedQuantityChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var sValue = oInput.getValue();
            var oContext = oInput.getBindingContext();
            if (oContext) {
                var oData = oContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var oLocalDataModel = oInput.getModel("localData");
                oLocalDataModel.setProperty("/proposedQuantities/" + sKey, sValue);
            }
        },

        onRowDataChange_lfimg: function (oEvent) {
            this._handleRowDataChange(oEvent, "lfimg");
        },

        onRowLiveChange_lfimg: function (oEvent) {
            this._handleRowDataChange(oEvent, "lfimg", true);
        },

        onRowDataChange_priority: function (oEvent) {
            this._handleRowDataChange(oEvent, "priority");
        },

        _getEventValue: function (oEvent, oControl) {
            if (oEvent && typeof oEvent.getParameter === "function") {
                var sValue = oEvent.getParameter("value");
                if (sValue !== undefined) {
                    return sValue;
                }

                sValue = oEvent.getParameter("newValue");
                if (sValue !== undefined) {
                    return sValue;
                }

                sValue = oEvent.getParameter("selectedItem");
                if (sValue && typeof sValue.getKey === "function") {
                    return sValue.getKey();
                }
            }

            return this._getControlValue(oControl);
        },

        _handleRowDataChange: function(oEvent, sFieldName, bLiveChange) {
            
            var oInput = oEvent.getSource();
            var sValue = this._getEventValue(oEvent, oInput);
            var oContext = oInput.getBindingContext();
            if (oContext) {
                var oData = oContext.getObject();
                var sRawValue = sValue;
                if (sFieldName === "lfimg") {
                    if (bLiveChange) {
                        if (typeof oInput.setValueState === "function") {
                            oInput.setValueState("None");
                        }
                    } else {
                        sValue = normalizeQuantityValue(sValue, oData.meins);
                        if (!sValue && (!sRawValue || !sRawValue.toString().trim())) {
                            sValue = normalizeQuantityValue(oData.lfimg, oData.meins);
                        }
                        if (typeof oInput.setValueState === "function") {
                            oInput.setValueState(sValue ? "None" : "Error");
                        }
                        if (typeof oInput.setValueStateText === "function") {
                            oInput.setValueStateText("Enter a valid delivery quantity.");
                        }
                        if (!sValue) {
                            return;
                        }
                        if (typeof oInput.setValue === "function") {
                            oInput.setValue(sValue);
                        }
                    }
                }
                var sKey = this._getRowKeyFromData(oData);
                var oLocalDataModel = oInput.getModel("localData");
                if (!sKey || !oLocalDataModel) {
                    return;
                }

                var sRowPath = "/changedRows/" + sKey;
                var oChangedRow = oLocalDataModel.getProperty(sRowPath);
                if (!oChangedRow) {
                    oLocalDataModel.setProperty(sRowPath, {});
                }

                oLocalDataModel.setProperty(sRowPath + "/" + sFieldName, sValue);
                oLocalDataModel.checkUpdate(true);
            }
        },

        _getControlValue: function (oControl) {
            if (oControl && typeof oControl.getSelectedKey === "function") {
                return oControl.getSelectedKey();
            }

            if (oControl && typeof oControl.getValue === "function") {
                return oControl.getValue();
            }

            return "";
        },
        
        isRowEditable: function(sStatus, sStatusDesc) {
            sStatus = (sStatus || "").toString().trim().toUpperCase();
            sStatusDesc = (sStatusDesc || "").toString().trim().toUpperCase();

            // Check if status or status_desc indicates the row is read-only
            if (sStatus === "R" || sStatus === "C" || sStatusDesc.indexOf("REJECTED") !== -1 || sStatusDesc.indexOf("COMPLETED") !== -1) {
                return false; // Not editable
            }
            return true; // Editable
        },

        isRowReadOnly: function(sStatus, sStatusDesc) {
            return !this.isRowEditable(sStatus, sStatusDesc);
        },

        _validateActionAllowed: function(aSelectedContexts) {
            for (var j = 0; j < aSelectedContexts.length; j++) {
                var oData = (typeof aSelectedContexts[j].getObject === "function") ? aSelectedContexts[j].getObject() : null;
                var sStatus = oData && oData.status !== undefined ? oData.status : (typeof aSelectedContexts[j].getProperty === "function" ? aSelectedContexts[j].getProperty("status") : "");
                var sStatusDesc = oData && oData.status_desc !== undefined ? oData.status_desc : (typeof aSelectedContexts[j].getProperty === "function" ? aSelectedContexts[j].getProperty("status_desc") : "");

                sStatus = (sStatus || "").trim().toUpperCase();
                sStatusDesc = (sStatusDesc || "").trim().toUpperCase();

                if (sStatus === "R" || sStatus === "C" || sStatusDesc.indexOf("REJECTED") !== -1 || sStatusDesc.indexOf("COMPLETED") !== -1) {
                    MessageToast.show("Cannot perform actions on Rejected or Completed items.");
                    return false;
                }
            }
            return true;
        },

        /**
         * Triggered when the Refresh simulation button is clicked.
         */
        onRefreshSimulation: function (oContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Please select at least one item to refresh.");
                return;
            }
            
            if (!this._validateActionAllowed(aSelectedContexts)) {
                return;
            }

            sap.ui.core.BusyIndicator.show(0);
            this._resetLocalTransientState();

            // 2. Call backend RAP action to delete custom lock table entries
            var oFirstContext = aSelectedContexts[0];
            var oModel = oFirstContext.getModel();
            var sActionName = "com.sap.gateway.srvd.zsd_ewm_mr_consolidation.v0001.onRefreshSimulation";
            
            var oAction = oModel.bindContext(sActionName + "(...)", oFirstContext);
            var aMrcon = [];
            aSelectedContexts.forEach(function (oSelContext) {
                var oData = oSelContext.getObject();
                aMrcon.push({
                    vbeln: oData.vbeln,
                    posnr: oData.posnr
                });
            });
            oAction.setParameter("_mrcon", aMrcon); 

            oAction.execute().then(function () {
                sap.ui.core.BusyIndicator.hide();
                this._resetLocalTransientState();
                MessageToast.show("Locks and proposals refreshed.");
                this.base.getExtensionAPI().refresh();
            }.bind(this)).catch(function (oError) {
                sap.ui.core.BusyIndicator.hide();
                this._resetLocalTransientState();
                // Even if it fails (e.g., action not fully implemented backend yet), we still cleared frontend JSON model
                MessageToast.show("Frontend Refreshed. Backend lock release may have warnings: " + (oError.message || ""));
            }.bind(this));
        },

        /**
         * Triggered when the Simulate button is clicked.
         */
        onSimulate: function (oContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Please select at least one item.");
                return;
            }

            var oController = this;
            var oLocalDataModel = this.base.getView().getModel("localData");
            var oProposedQuantities = oLocalDataModel.getProperty("/proposedQuantities") || {};
            var oMessageTypes = oLocalDataModel.getProperty("/messageTypes") || {};
            var oMessages = oLocalDataModel.getProperty("/messages") || {};
            
            sap.ui.core.BusyIndicator.show(0);

            aSelectedContexts.forEach(function (oItemContext) {
                var oSelectedData = oItemContext.getObject();
                var sSelectedKey = oController._getRowKeyFromData(oSelectedData);
                oMessageTypes[sSelectedKey] = "";
                oMessages[sSelectedKey] = "";
            });

            var sActionName = "com.sap.gateway.srvd.zsd_ewm_mr_consolidation.v0001.onSimulate";
            var aPromises = [];
            
            aSelectedContexts.forEach(function (oItemContext) {
                var oModel = oItemContext.getModel();
                var oAction = oModel.bindContext(sActionName + "(...)", oItemContext);
                
                var oPromise = oAction.execute().then(function () {
                    var oActionContext = oAction.getBoundContext();
                    return oActionContext ? oActionContext.requestObject() : null;
                });
                aPromises.push(oPromise);
            });
            
            Promise.all(aPromises).then(function (aResults) {
                sap.ui.core.BusyIndicator.hide();
                console.log("Action completed. Raw results: ", aResults);

                aResults.forEach(function(oResult, iIndex) {
                    if (oResult) {
                        var aData = [];
                    if (oResult.value && Array.isArray(oResult.value)) {
                        if (oResult.value.length > 0 && oResult.value[0] && Array.isArray(oResult.value[0]._mrcon)) {
                            aData = oResult.value[0]._mrcon;
                        } else {
                            aData = oResult.value;
                        }
                    } else if (oResult._mrcon && Array.isArray(oResult._mrcon)) {
                        aData = oResult._mrcon;
                    } else if (Array.isArray(oResult)) {
                        aData = oResult;
                    } else {
                        aData = [oResult];
                    }
                    
                    console.log("Parsed Array Data: ", aData);
                    
                    aData.forEach(function(oItem) {
                        console.log("Returned Item: ", oItem);

                        var sVbeln = oItem.vbeln || oItem.Vbeln;
                        var sPosnr = oItem.posnr || oItem.Posnr;
                        var sZmenge = oItem.zmenge !== undefined ? oItem.zmenge : oItem.Zmenge;
                        var sType = oItem.type !== undefined ? oItem.type : oItem.Type;
                        var sMessage = oItem.message !== undefined ? oItem.message : oItem.Message;
                        var sDatasource = aSelectedContexts[iIndex] && aSelectedContexts[iIndex].getProperty("datasource");

                        if (sDatasource && sVbeln && sPosnr) {
                            var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
                            oProposedQuantities[sKey] = sZmenge;
                            oMessageTypes[sKey] = sType || "";
                            oMessages[sKey] = sMessage || "";
                        }
                    });
                }
                });
                
                // Refresh UI JSONModel to trigger value rendering in fragments
                oLocalDataModel.setProperty("/proposedQuantities", Object.assign({}, oProposedQuantities));
                oLocalDataModel.setProperty("/messageTypes", Object.assign({}, oMessageTypes));
                oLocalDataModel.setProperty("/messages", Object.assign({}, oMessages));
                oLocalDataModel.refresh(true);
                
                console.log("Final proposed quantities map: ", oLocalDataModel.getProperty("/proposedQuantities"));
                MessageToast.show("Simulation completed");

            }).catch(function (oError) {
                sap.ui.core.BusyIndicator.hide();
                MessageToast.show("Simulation Failed: " + (oError.message || "Unknown error"));
            });
        },

        /**
         * Triggered when the Change button is clicked.
         * Sends modified Delivery Quantity and Priority to the backend action.
         */
        onChange: function (oContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Please select at least one item.");
                return;
            }            
            if (!this._validateActionAllowed(aSelectedContexts)) {
                return;
            }
            if (this._hasInvalidSelectedQuantity(aSelectedContexts)) {
                MessageToast.show("Delivery Quantity must be a valid number.");
                return;
            }
            sap.ui.core.BusyIndicator.show(0);

            var oLocalDataModel = this.base.getView().getModel("localData");
            var oMessageTypes = oLocalDataModel.getProperty("/messageTypes") || {};
            var oMessages = oLocalDataModel.getProperty("/messages") || {};
            
            aSelectedContexts.forEach(function (oItemContext) {
                var oSelectedData = oItemContext.getObject();
                var sSelectedKey = this._getRowKeyFromData(oSelectedData);
                oMessageTypes[sSelectedKey] = "";
                oMessages[sSelectedKey] = "";
            }.bind(this));

            var sActionName = "com.sap.gateway.srvd.zsd_ewm_mr_consolidation.v0001.onChange";
            var aPromises = [];
            
            aSelectedContexts.forEach(function (oSelContext) {
                var oData = oSelContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var oChangedRow = oLocalDataModel.getProperty("/changedRows/" + sKey) || {};
                
                var sFinalLfimg = getFinalLfimgValue(oChangedRow, oData) || "0";
                var sFinalPriority = oChangedRow.priority !== undefined ? oChangedRow.priority : (oData.priority || "");
                
                var aMrcon = [{
                    vbeln: oData.vbeln,
                    posnr: oData.posnr,
                    lfimg: sFinalLfimg,
                    meins: oData.meins || "",
                    priority: sFinalPriority
                }];

                var oModel = oSelContext.getModel();
                var oAction = oModel.bindContext(sActionName + "(...)", oSelContext);
                oAction.setParameter("dummy", "");
                oAction.setParameter("_mrcon", aMrcon);

                var oPromise = oAction.execute().then(function () {
                    var oActionContext = oAction.getBoundContext();
                    return oActionContext ? oActionContext.requestObject() : null;
                });
                aPromises.push(oPromise);
            }.bind(this));

            Promise.all(aPromises).then(function (aResults) {
                sap.ui.core.BusyIndicator.hide();
                var bHasError = false;

                aResults.forEach(function (oResult, iIndex) {
                    if (oResult) {
                        var aData = [];
                        if (oResult.value && Array.isArray(oResult.value)) {
                            if (oResult.value.length > 0 && oResult.value[0] && Array.isArray(oResult.value[0]._mrcon)) {
                                aData = oResult.value[0]._mrcon;
                            } else {
                                aData = oResult.value;
                            }
                        } else if (oResult._mrcon && Array.isArray(oResult._mrcon)) {
                            aData = oResult._mrcon;
                        } else if (Array.isArray(oResult)) {
                            aData = oResult;
                        } else {
                            aData = [oResult];
                        }

                        aData.forEach(function (oItem) {
                            var sVbeln = oItem.vbeln || oItem.Vbeln;
                            var sPosnr = oItem.posnr || oItem.Posnr;
                            var sType = oItem.type !== undefined ? oItem.type : oItem.Type;
                            var sMessage = oItem.message !== undefined ? oItem.message : oItem.Message;
                            var sDatasource = aSelectedContexts[iIndex] && aSelectedContexts[iIndex].getProperty("datasource");

                            if (sDatasource && sVbeln && sPosnr) {
                                var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
                                oMessageTypes[sKey] = sType || "";
                                oMessages[sKey] = sMessage || "";
                                if (sType === "E" || sType === "A") {
                                    bHasError = true;
                                }
                            }
                        });
                    }
                }.bind(this));

                oLocalDataModel.setProperty("/messageTypes", Object.assign({}, oMessageTypes));
                oLocalDataModel.setProperty("/messages", Object.assign({}, oMessages));
                oLocalDataModel.checkUpdate(true);
                
                if (bHasError) {
                    MessageToast.show("Change processed with errors.");
                } else {
                    MessageToast.show("Change applied successfully.");
                    this.base.getExtensionAPI().refresh();
                }
            }.bind(this)).catch(function (oError) {
                sap.ui.core.BusyIndicator.hide();
                var sErrorMsg = oError.message || "Unknown error";
                if (oError.error && oError.error.message) {
                    sErrorMsg = typeof oError.error.message === "string" ? oError.error.message : (oError.error.message.value || sErrorMsg);
                }
                sap.ui.require(["sap/m/MessageBox"], function (MessageBox) {
                    MessageBox.error(sErrorMsg, {
                        title: "Change Failed"
                    });
                });
            }.bind(this));
        },

        /**
         * Triggered when the Reject button is clicked.
         * Sends data to the backend action onReject.
         */
        onReject: function (oContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Please select at least one item.");
                return;
            }            
            if (!this._validateActionAllowed(aSelectedContexts)) {
                return;
            }
            if (this._hasInvalidSelectedQuantity(aSelectedContexts)) {
                MessageToast.show("Delivery Quantity must be a valid number.");
                return;
            }
            sap.ui.core.BusyIndicator.show(0);

            var oLocalDataModel = this.base.getView().getModel("localData");
            var oMessageTypes = oLocalDataModel.getProperty("/messageTypes") || {};
            var oMessages = oLocalDataModel.getProperty("/messages") || {};
            
            aSelectedContexts.forEach(function (oItemContext) {
                var oSelectedData = oItemContext.getObject();
                var sSelectedKey = this._getRowKeyFromData(oSelectedData);
                oMessageTypes[sSelectedKey] = "";
                oMessages[sSelectedKey] = "";
            }.bind(this));

            var sActionName = "com.sap.gateway.srvd.zsd_ewm_mr_consolidation.v0001.onReject";
            var aPromises = [];
            
            aSelectedContexts.forEach(function (oSelContext) {
                var oData = oSelContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var oChangedRow = oLocalDataModel.getProperty("/changedRows/" + sKey) || {};
                
                var sFinalLfimg = getFinalLfimgValue(oChangedRow, oData) || "0";
                var sFinalPriority = oChangedRow.priority !== undefined ? oChangedRow.priority : (oData.priority || "");
                
                var aMrcon = [{
                    vbeln: oData.vbeln,
                    posnr: oData.posnr,
                    lfimg: sFinalLfimg,
                    meins: oData.meins || "",
                    priority: sFinalPriority
                }];

                var oModel = oSelContext.getModel();
                var oAction = oModel.bindContext(sActionName + "(...)", oSelContext);
                oAction.setParameter("dummy", "");
                oAction.setParameter("_mrcon", aMrcon);

                var oPromise = oAction.execute().then(function () {
                    var oActionContext = oAction.getBoundContext();
                    return oActionContext ? oActionContext.requestObject() : null;
                });
                aPromises.push(oPromise);
            }.bind(this));

            Promise.all(aPromises).then(function (aResults) {
                sap.ui.core.BusyIndicator.hide();
                var bHasError = false;

                aResults.forEach(function (oResult, iIndex) {
                    if (oResult) {
                        var aData = [];
                        if (oResult.value && Array.isArray(oResult.value)) {
                            if (oResult.value.length > 0 && oResult.value[0] && Array.isArray(oResult.value[0]._mrcon)) {
                                aData = oResult.value[0]._mrcon;
                            } else {
                                aData = oResult.value;
                            }
                        } else if (oResult._mrcon && Array.isArray(oResult._mrcon)) {
                            aData = oResult._mrcon;
                        } else if (Array.isArray(oResult)) {
                            aData = oResult;
                        } else {
                            aData = [oResult];
                        }

                        aData.forEach(function (oItem) {
                            var sVbeln = oItem.vbeln || oItem.Vbeln;
                            var sPosnr = oItem.posnr || oItem.Posnr;
                            var sType = oItem.type !== undefined ? oItem.type : oItem.Type;
                            var sMessage = oItem.message !== undefined ? oItem.message : oItem.Message;
                            var sDatasource = aSelectedContexts[iIndex] && aSelectedContexts[iIndex].getProperty("datasource");

                            if (sDatasource && sVbeln && sPosnr) {
                                var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
                                oMessageTypes[sKey] = sType || "";
                                oMessages[sKey] = sMessage || "";
                                if (sType === "E" || sType === "A") {
                                    bHasError = true;
                                }
                            }
                        });
                    }
                }.bind(this));

                oLocalDataModel.setProperty("/messageTypes", Object.assign({}, oMessageTypes));
                oLocalDataModel.setProperty("/messages", Object.assign({}, oMessages));
                oLocalDataModel.checkUpdate(true);
                
                if (bHasError) {
                    MessageToast.show("Reject processed with errors.");
                } else {
                    MessageToast.show("Reject applied successfully.");
                    this.base.getExtensionAPI().refresh();
                }
            }.bind(this)).catch(function (oError) {
                sap.ui.core.BusyIndicator.hide();
                var sErrorMsg = oError.message || "Unknown error";
                if (oError.error && oError.error.message) {
                    sErrorMsg = typeof oError.error.message === "string" ? oError.error.message : (oError.error.message.value || sErrorMsg);
                }
                sap.ui.require(["sap/m/MessageBox"], function (MessageBox) {
                    MessageBox.error(sErrorMsg, {
                        title: "Reject Failed"
                    });
                });
            }.bind(this));
        },

        _doConfirm: function (oContext, aSelectedContexts, sDummy) {
            if (this._hasInvalidSelectedQuantity(aSelectedContexts)) {
                MessageToast.show("Delivery Quantity must be a valid number.");
                return;
            }
            sap.ui.core.BusyIndicator.show(0);
            var oLocalDataModel = this.base.getView().getModel("localData");
            var oMessageTypes = oLocalDataModel.getProperty("/messageTypes") || {};
            var oMessages = oLocalDataModel.getProperty("/messages") || {};
            
            aSelectedContexts.forEach(function (oItemContext) {
                var oSelectedData = oItemContext.getObject();
                var sSelectedKey = this._getRowKeyFromData(oSelectedData);
                oMessageTypes[sSelectedKey] = "";
                oMessages[sSelectedKey] = "";
            }.bind(this));

            var sActionName = "com.sap.gateway.srvd.zsd_ewm_mr_consolidation.v0001.onConfirm";
            var aPromises = [];

            aSelectedContexts.forEach(function (oSelContext) {
                var oData = oSelContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var sProposedQty = oLocalDataModel.getProperty("/proposedQuantities/" + sKey) || "";
                
                var oChangedRow = oLocalDataModel.getProperty("/changedRows/" + sKey) || {};
                var sFinalLfimg = getFinalLfimgValue(oChangedRow, oData) || "0";
                var sFinalPriority = oChangedRow.priority !== undefined ? oChangedRow.priority : oData.priority;
                
                var aMrcon = [{
                    vbeln: oData.vbeln,
                    posnr: oData.posnr,
                    zmenge: sProposedQty.toString(),
                    lfimg: sFinalLfimg,
                    meins: oData.meins || "",
                    priority: sFinalPriority || ""
                }];

                var oModel = oSelContext.getModel();
                var oAction = oModel.bindContext(sActionName + "(...)", oSelContext);
                
                if (sDummy !== undefined && sDummy !== null) {
                    oAction.setParameter("dummy", sDummy);
                } else {
                    oAction.setParameter("dummy", "");
                }
                
                oAction.setParameter("_mrcon", aMrcon); 

                var oPromise = oAction.execute().then(function () {
                    var oActionContext = oAction.getBoundContext();
                    return oActionContext ? oActionContext.requestObject() : null;
                });
                aPromises.push(oPromise);
            }.bind(this));

            Promise.all(aPromises).then(function (aResults) {
                sap.ui.core.BusyIndicator.hide();
                var bHasError = false;

                aResults.forEach(function (oResult, iIndex) {
                    if (oResult) {
                        var aData = [];
                        if (oResult.value && Array.isArray(oResult.value)) {
                            if (oResult.value.length > 0 && oResult.value[0] && Array.isArray(oResult.value[0]._mrcon)) {
                                aData = oResult.value[0]._mrcon;
                            } else {
                                aData = oResult.value;
                            }
                        } else if (oResult._mrcon && Array.isArray(oResult._mrcon)) {
                            aData = oResult._mrcon;
                        } else if (Array.isArray(oResult)) {
                            aData = oResult;
                        } else {
                            aData = [oResult];
                        }

                        aData.forEach(function (oItem) {
                            var sVbeln = oItem.vbeln || oItem.Vbeln;
                            var sPosnr = oItem.posnr || oItem.Posnr;
                            var sType = oItem.type !== undefined ? oItem.type : oItem.Type;
                            var sMessage = oItem.message !== undefined ? oItem.message : oItem.Message;
                            var sDatasource = aSelectedContexts[iIndex] && aSelectedContexts[iIndex].getProperty("datasource");

                            if (sDatasource && sVbeln && sPosnr) {
                                var sKey = buildRowKey(sDatasource, sVbeln, sPosnr);
                                oMessageTypes[sKey] = sType || "";
                                oMessages[sKey] = sMessage || "";
                                if (sType === "E" || sType === "A") {
                                    bHasError = true;
                                }
                            }
                        });
                    }
                }.bind(this));

                oLocalDataModel.setProperty("/messageTypes", Object.assign({}, oMessageTypes));
                oLocalDataModel.setProperty("/messages", Object.assign({}, oMessages));
                oLocalDataModel.checkUpdate(true);
                
                if (bHasError) {
                    MessageToast.show("Confirm processed with errors.");
                } else {
                    MessageToast.show("Confirm Sequence Success!");
                    this.base.getExtensionAPI().refresh();
                }
            }.bind(this)).catch(function (oError) {
                sap.ui.core.BusyIndicator.hide();
                var sErrorMsg = oError.message || "Unknown error";
                if (oError.error && oError.error.message) {
                    sErrorMsg = typeof oError.error.message === "string" ? oError.error.message : (oError.error.message.value || sErrorMsg);
                }
                sap.ui.require(["sap/m/MessageBox"], function (MessageBox) {
                    MessageBox.error(sErrorMsg, {
                        title: "Confirm Failed"
                    });
                });
            }.bind(this));
        },

        /**
         * Triggered when the Confirm button is clicked.
         * Collects the finalized data and sends payload to backend Action/Function.
         */
        onConfirm: function (oContext, aSelectedContexts) {
            if (!aSelectedContexts || aSelectedContexts.length === 0) {
                MessageToast.show("Please select at least one item.");
                return;
            }
            
            if (!this._validateActionAllowed(aSelectedContexts)) {
                return;
            }

            var oLocalDataModel = this.base.getView().getModel("localData");
            var bHasLowerProposedQty = false;

            aSelectedContexts.forEach(function (oSelContext) {
                var oData = oSelContext.getObject();
                var sKey = this._getRowKeyFromData(oData);
                var sProposedQty = oLocalDataModel.getProperty("/proposedQuantities/" + sKey) || "";
                
                var oChangedRow = oLocalDataModel.getProperty("/changedRows/" + sKey) || {};
                var sFinalLfimg = getFinalLfimgValue(oChangedRow, oData);
                
                var fProposedQty = parseFloat(sProposedQty);
                var fDeliveryQty = parseFloat(sFinalLfimg);

                if (!isNaN(fProposedQty) && !isNaN(fDeliveryQty) && fProposedQty < fDeliveryQty) {
                    bHasLowerProposedQty = true;
                }
            }.bind(this));

            if (bHasLowerProposedQty) {
                sap.ui.require(["sap/m/MessageBox"], function (MessageBox) {
                    MessageBox.warning("The proposed quantity is less than delivery quantity,Retain the original quantity or update quantity.", {
                        actions: ["Retain", "Update"],
                        emphasizedAction: "Update",
                        onClose: function (sAction) {
                            if (sAction === "Retain") {
                                this._doConfirm(oContext, aSelectedContexts, "R");
                            } else if (sAction === "Update") {
                                this._doConfirm(oContext, aSelectedContexts, "U");
                            }
                        }.bind(this)
                    });
                }.bind(this));
            } else {
                this._doConfirm(oContext, aSelectedContexts, "");
            }
        }
    });
});