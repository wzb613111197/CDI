sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/ResizeHandler"
], function (ControllerExtension, JSONModel, Fragment, Dialog, Button, MessageToast, MessageBox, BusyIndicator, ResizeHandler) {
    "use strict";

    var MASS_UPDATE_MATERIAL_TYPES = ["ZCOM", "ZMEA", "ZPAC", "ZYDM"];

    return ControllerExtension.extend("com.cathaydining.zsdi001.ext.controller.ListReportExtension", {
        override: {
            onInit: function () {
                this.base.getView().setModel(new JSONModel({
                    confirmInProgress: false,
                    MassUpdate: { vaidfrom: null },
                    selectedMaterialRows: [],
                    quotationDetail: {
                        bom: { title: "", tree: [], priceHistory: [] }
                    }
                }), "ui");
            }
        },

        onMaterialSendSpecification: async function () {
            var aSelectedContexts = this.base.getExtensionAPI().getSelectedContexts();
            if (!aSelectedContexts.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            BusyIndicator.show(0);
            try {
                var aRows = await Promise.all(aSelectedContexts.map(function (oContext) {
                    return this._mapMaterialContextToRow(oContext);
                }.bind(this)));
                this._getUiModel().setProperty("/selectedMaterialRows", aRows);
                this._getUiModel().setProperty("/MassUpdate/vaidfrom", null);
                (await this._getSendSpecificationDialog()).open();
            } catch (oError) {
                MessageBox.error(this._getText("msgSendToCpFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        onLoadingTemplateSendSpecification: async function () {
            var aSelectedContexts = this.base.getExtensionAPI().getSelectedContexts();
            var oModel = this.base.getView().getModel();

            if (!aSelectedContexts.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }
            if (!oModel) {
                MessageBox.error(this._getText("msgSendToCpFailed", [this._getText("msgMissingModel", ["mainService"])]));
                return;
            }

            BusyIndicator.show(0);
            try {
                var oActionBinding = oModel.bindContext("/load_temp/com.sap.gateway.srvd.zsd_sd_send_specification.v0001.GetMaterial(...)");
                oActionBinding.setParameter("resend", false);
                oActionBinding.setParameter("cp", false);
                oActionBinding.setParameter("_loadTemp", aSelectedContexts.map(function (oContext) {
                    var oData = oContext.getObject() || {};
                    return {
                        LoadingTempCode: oData.LoadingTempCode || "",
                        LoadingTempKey: oData.LoadingTempKey || "",
                        CabinClass: oData.CabinClass || "",
                        AircraftType: oData.AircraftType || ""
                    };
                }));
                await oActionBinding.execute();

                var aRootResults = this._normalizeActionResultArray(await this._requestActionResult(oActionBinding));
                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                this._getUiModel().setProperty("/selectedMaterialRows", (aRootResults[0] && aRootResults[0]._material) || []);
                this._getUiModel().setProperty("/MassUpdate/vaidfrom", null);
                (await this._getSendSpecificationDialog()).open();
            } catch (oError) {
                MessageBox.error(this._getText("msgLoadingTemplateBatchFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        _getSendSpecificationDialog: function () {
            var oView = this.base.getView();

            // Recreate so layout/height logic from latest controller+fragment is applied
            if (this._oSendSpecificationDialog && !this._oSendSpecificationDialog.bIsDestroyed) {
                this._deregisterSendSpecResize();
                this._oSendSpecificationDialog.destroy();
                this._oSendSpecificationDialog = null;
                this._pSendSpecificationDialog = null;
                this._oSendSpecTable = null;
                this._oSendSpecContent = null;
            }
            if (this._oSendSpecificationDialog && this._oSendSpecificationDialog.bIsDestroyed) {
                this._oSendSpecificationDialog = null;
                this._pSendSpecificationDialog = null;
                this._oSendSpecTable = null;
                this._oSendSpecContent = null;
            }

            if (!this._pSendSpecificationDialog) {
                this._pSendSpecificationDialog = Fragment.load({
                    name: "com.cathaydining.zsdi001.ext.fragments.SendSpecification",
                    controller: this
                }).then(function (oContent) {
                    this._oSendSpecContent = oContent;
                    this._oSendSpecTable = (oContent.findAggregatedObjects(false, function (oControl) {
                        return oControl.isA("sap.ui.table.Table") || oControl.isA("sap.m.Table");
                    }) || [])[0] || null;
                    var oDialog = new Dialog({
                        title: "{i18n>SendSpecTitle}",
                        stretch: true,
                        resizable: true,
                        draggable: true,
                        horizontalScrolling: false,
                        verticalScrolling: false,
                        content: [oContent],
                        endButton: new Button({
                            text: "{i18n>qdClose}",
                            press: function () {
                                oDialog.close();
                            }
                        }),
                        afterOpen: function () {
                            this._iSendSpecLastHeight = null;
                            // Wait for stretch dialog layout, then default-select all rows
                            setTimeout(function () {
                                this._adjustSendSpecTableHeight();
                                this._selectAllSendSpecRows();
                            }.bind(this), 50);
                            // Second pass after binding settles (Auto row count)
                            setTimeout(function () {
                                this._selectAllSendSpecRows();
                            }.bind(this), 200);
                        }.bind(this),
                        afterClose: function () {
                            this._deregisterSendSpecResize();
                            // Drop stale selection so the next open defaults to select-all, not last indices
                            if (this._oSendSpecTable && !this._oSendSpecTable.bIsDestroyed
                                    && typeof this._oSendSpecTable.clearSelection === "function") {
                                this._oSendSpecTable.clearSelection();
                            }
                        }.bind(this)
                    });
                    oDialog.addStyleClass("sendSpecDialog");
                    oView.addDependent(oDialog);
                    this._oSendSpecificationDialog = oDialog;
                    return oDialog;
                }.bind(this)).catch(function (oError) {
                    this._pSendSpecificationDialog = null;
                    this._oSendSpecificationDialog = null;
                    this._oSendSpecTable = null;
                    this._oSendSpecContent = null;
                    throw oError;
                }.bind(this));
            }
            return this._pSendSpecificationDialog;
        },

        /**
         * Stretch GridTable to dialog content height so Auto row count fills the dialog.
         * @private
         */
        _adjustSendSpecTableHeight: function () {
            var oDialog = this._oSendSpecificationDialog;
            var oTable = this._oSendSpecTable;
            if (this._bSendSpecAdjusting || !oDialog || !oTable || oDialog.bIsDestroyed || oTable.bIsDestroyed) {
                return;
            }
            var oDialogDom = oDialog.getDomRef();
            if (!oDialogDom) {
                return;
            }

            var oScrollCont = oDialogDom.querySelector(".sapMDialogScrollCont") || oDialogDom.querySelector(".sapMDialogSection");
            var oToolbar = oDialogDom.querySelector(".sendSpecToolbar");
            if (!oScrollCont) {
                return;
            }

            var iAvail = oScrollCont.clientHeight - (oToolbar ? oToolbar.offsetHeight : 0) - 4;
            if (iAvail < 160) {
                return;
            }
            if (this._iSendSpecLastHeight === iAvail) {
                return;
            }

            this._bSendSpecAdjusting = true;
            this._iSendSpecLastHeight = iAvail;
            try {
                if (this._oSendSpecContent && !this._oSendSpecContent.bIsDestroyed) {
                    this._oSendSpecContent.setHeight(oScrollCont.clientHeight + "px");
                }
                oTable.setVisibleRowCountMode("Auto");
                oTable.setHeight(iAvail + "px");
                if (typeof oTable._updateTableSizes === "function") {
                    oTable._updateTableSizes();
                }
            } finally {
                this._bSendSpecAdjusting = false;
            }

            if (!this._iSendSpecResizeId) {
                this._iSendSpecResizeId = ResizeHandler.register(oDialog, function () {
                    this._iSendSpecLastHeight = null;
                    this._adjustSendSpecTableHeight();
                }.bind(this));
            }
        },

        _deregisterSendSpecResize: function () {
            if (this._iSendSpecResizeId) {
                ResizeHandler.deregister(this._iSendSpecResizeId);
                this._iSendSpecResizeId = null;
            }
            this._iSendSpecLastHeight = null;
        },

        
        onMassUpdate: function () {
            var oUiModel = this._getUiModel();
            var aSelectedRows = oUiModel.getProperty("/selectedMaterialRows") || [];
            var aSelectedIndexes = this._getMassUpdateSelectedIndexes();
            var sVaidFrom = this._toEdmDateValue(oUiModel.getProperty("/MassUpdate/vaidfrom"));
            var iUpdated = 0;

            if (!sVaidFrom) {
                MessageToast.show(this._getText("msgRequiredFields"));
                return;
            }
            if (!aSelectedIndexes.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            oUiModel.setProperty("/selectedMaterialRows", aSelectedRows.map(function (oRow, iIndex) {
                if (aSelectedIndexes.indexOf(iIndex) === -1) {
                    return oRow;
                }
                // Skip ZCOM/ZMEA/ZPAC/ZYDM; update only when MaterialType is not one of these four.
                if (MASS_UPDATE_MATERIAL_TYPES.indexOf(String((oRow && oRow.MaterialType) || "").toUpperCase()) !== -1) {
                    return oRow;
                }
                iUpdated += 1;
                return Object.assign({}, oRow, {
                    VaidForm: sVaidFrom,
                    BomEffectiveDate: sVaidFrom
                });
            }));
            // Model replace rebinds rows — restore the user's selection (do not select-all)
            this._restoreSendSpecSelectionAfterUpdate(aSelectedIndexes);
            // Keep DatePicker value (Date); do not overwrite with yyyy-MM-dd string.
            MessageToast.show(this._getText(iUpdated ? "msgMassUpdateSuccess" : "msgMassUpdateSkipped", [iUpdated]));
        },

        onRetriggerToCp: function () {
            var that = this;
            var sContinue = this._getText("btnContinue");
            MessageBox.warning(this._getText("msgRetriggerToCpConfirm"), {
                actions: [sContinue, MessageBox.Action.CANCEL],
                emphasizedAction: sContinue,
                onClose: function (sAction) {
                    if (sAction === sContinue) {
                        that._sendToCp(true);
                    }
                }
            });
        },

        onTriggerToCp: function () {
            return this._sendToCp(false);
        },

        onQDViewItem: async function (oEvent) {
            var oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            var oCtx = oSource && oSource.getBindingContext ? oSource.getBindingContext("ui") : null;
            var oCurrentItem = oCtx && oCtx.getObject ? oCtx.getObject() || {} : {};
            var oModel = this.base.getView().getModel("qtLoadTemp");

            if (!oModel) {
                MessageBox.error(this._getText("msgGetBomFailed", [this._getText("msgMissingModel", ["qtLoadTemp"])]));
                return;
            }

            var mParams = {
                Material: oCurrentItem.Material || "",
                SalesOrg: oCurrentItem.SalesOrg || "",
                DistChannel: oCurrentItem.DistChannel || "",
                Division: oCurrentItem.Division || "",
                Customer: oCurrentItem.Customer || "",
                EffectiveFrom: this._toEdmDateValue(
                    oCurrentItem.BomEffectiveDate || oCurrentItem.VaidForm || oCurrentItem.EffectiveFrom || oCurrentItem.ValidFrom
                )
            };

            if (!mParams.Material || !mParams.SalesOrg || !mParams.DistChannel) {
                MessageBox.error(this._getText("msgInvalidBomRow"));
                return;
            }

            BusyIndicator.show(0);
            try {
                var oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetBOM(...)");
                Object.keys(mParams).forEach(function (sKey) {
                    oActionBinding.setParameter(sKey, mParams[sKey]);
                });
                await oActionBinding.execute();

                var aRootResults = this._normalizeActionResultArray(await this._requestActionResult(oActionBinding));
                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                var oRoot = aRootResults[0] || {};
                this._getUiModel().setProperty("/quotationDetail/bom", {
                    title: mParams.Material,
                    tree: this._buildBomTreeData(Array.isArray(oRoot._bomList) ? oRoot._bomList : []),
                    priceHistory: Array.isArray(oRoot._priceHistory) ? oRoot._priceHistory : []
                });
                await this._openBomTreeDialog();
            } catch (oError) {
                MessageBox.error(this._getText("msgGetBomFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        onCloseBomTreeDialog: function () {
            if (this._oBomTreeDialog && this._oBomTreeDialog.close) {
                this._oBomTreeDialog.close();
            }
        },

        _sendToCp: async function (bResend) {
            var oUiModel = this._getUiModel();
            var oModel = this.base.getView().getModel();
            var aSelectedRows = this._getMassUpdateSelectedRows();

            if (oUiModel.getProperty("/confirmInProgress")) {
                return;
            }
            if (!aSelectedRows.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }
            if (!oModel) {
                MessageBox.error(this._getText("msgSendToCpFailed", [this._getText("msgMissingModel", ["mainService"])]));
                return;
            }

            oUiModel.setProperty("/confirmInProgress", true);
            BusyIndicator.show(0);
            try {
                // $direct: avoid sharing List Report $batch (causes "$batch failed").
                var oActionBinding = oModel.bindContext(
                    "/load_temp/com.sap.gateway.srvd.zsd_sd_send_specification.v0001.SendToCP(...)",
                    null,
                    { $$groupId: "$direct" }
                );
                oActionBinding.setParameter("resend", !!bResend);
                oActionBinding.setParameter("_material", aSelectedRows.map(function (oRow) {
                    // Payload must match ZA_SD_INT_SEND only.
                    return {
                        BillOfMaterial: oRow.BillOfMaterial || "",
                        AlternativeBOM: oRow.AlternativeBOM || "",
                        InternalCounter: oRow.InternalCounter || "",
                        Material: oRow.Material || "",
                        SalesOrg: oRow.SalesOrg || "",
                        DistChannel: oRow.DistChannel || "",
                        MaterialType: oRow.MaterialType || "",
                        MaterialStatus: oRow.MaterialStatus || "",
                        CabinClass: oRow.CabinClass || "",
                        BomStatus: oRow.BomStatus || "",
                        BomEffectiveDate: this._toEdmDateValue(oRow.BomEffectiveDate || oRow.VaidForm),
                        BomEndDate: this._toEdmDateValue(oRow.BomEndDate),
                        Resend: !!oRow.Resend,
                        CpStatus: oRow.CpStatus || "",
                        Description: oRow.Description || "",
                        AirlineCode: oRow.AirlineCode || "",
                        SpecType: oRow.SpecType || "",
                        ServiceType: oRow.ServiceType || "",
                        AltDescription: oRow.AltDescription || "",
                        SpecTagCategory: oRow.SpecTagCategory || ""
                    };
                }.bind(this)));

                await oActionBinding.execute();
                var aRootResults = this._normalizeActionResultArray(await this._requestActionResult(oActionBinding));
                // Refresh table from returned _material (includes Type / Message).
                this._applySendToCpResult(aRootResults);
                // Keep current table selection — Trigger/Retrigger always uses selected rows only
            } catch (oError) {
                MessageBox.error(this._getText("msgSendToCpFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
                oUiModel.setProperty("/confirmInProgress", false);
            }
        },

        /**
         * Matches SendToCP return _material by Material + BomEffectiveDate and writes
         * Type/Message onto existing ui>/selectedMaterialRows (does not replace the whole list).
         * Propagates root Type/Message onto rows when item-level values are empty.
         * @param {object[]} aRootResults ZA_SD_INT_MATERIAL_ROOT collection
         * @private
         */
        _applySendToCpResult: function (aRootResults) {
            var oUiModel = this._getUiModel();
            var aExistingRows = oUiModel.getProperty("/selectedMaterialRows") || [];
            var mByKey = {};

            (aRootResults || []).forEach(function (oRoot) {
                oRoot = oRoot || {};
                var sRootType = oRoot.Type || oRoot.type || "";
                var sRootMessage = oRoot.Message || oRoot.Mesage || oRoot.message || "";
                var aMats = Array.isArray(oRoot._material) ? oRoot._material : [];
                aMats.forEach(function (oMat) {
                    oMat = oMat || {};
                    var sKey = this._buildSendToCpRowKey(oMat);
                    if (!sKey) {
                        return;
                    }
                    mByKey[sKey] = {
                        Type: oMat.Type || oMat.type || sRootType || "",
                        Message: oMat.Message || oMat.Mesage || oMat.message || sRootMessage || ""
                    };
                }.bind(this));
            }.bind(this));

            if (!Object.keys(mByKey).length) {
                return;
            }

            var aSelectedIndexes = this._getMassUpdateSelectedIndexes();
            oUiModel.setProperty("/selectedMaterialRows", aExistingRows.map(function (oRow) {
                var oMatch = mByKey[this._buildSendToCpRowKey(oRow)];
                if (!oMatch) {
                    return oRow;
                }
                return Object.assign({}, oRow, {
                    Type: oMatch.Type,
                    Message: oMatch.Message
                });
            }.bind(this)));
            // Keep the rows the user had selected for Trigger/Retrigger
            this._restoreSendSpecSelectionAfterUpdate(aSelectedIndexes);
        },

        _buildSendToCpRowKey: function (oRow) {
            oRow = oRow || {};
            var sMaterial = String(oRow.Material || "").trim();
            if (!sMaterial) {
                return "";
            }
            var sBomEffectiveDate = this._toEdmDateValue(
                oRow.BomEffectiveDate || oRow.VaidForm || oRow.EffectiveFrom || oRow.ValidFrom
            ) || "";
            return sMaterial + "|" + sBomEffectiveDate;
        },

        _buildBomTreeData: function (aItems) {
            var mNodesByLevelPred = new Map();
            var aNodes = (Array.isArray(aItems) ? aItems : []).map(function (oRow) {
                var iLevel = Number(oRow && oRow.BomLevel);
                var iPred = Number(oRow && oRow.PathPredecessor);
                var iParentPred = Number(oRow && oRow.ParentPath);
                var oNode = {
                    BomLevel: isNaN(iLevel) ? "" : iLevel,
                    ParentPath: isNaN(iParentPred) ? "" : iParentPred,
                    Material: (oRow && oRow.Material) || "",
                    MaterialDesc: (oRow && oRow.MaterialDesc) || "",
                    ValidFrom: (oRow && oRow.ValidFrom) || "",
                    ValidTo: (oRow && oRow.ValidTo) || "",
                    Price: (oRow && oRow.Price) || "",
                    Currency: (oRow && oRow.Currency) || "",
                    children: []
                };
                mNodesByLevelPred.set([String(iLevel), String(iPred)].join("-"), oNode);
                return oNode;
            });
            var aRoots = [];

            aNodes.forEach(function (oNode) {
                var iLevel = Number(oNode.BomLevel);
                var sParentKey = [String(iLevel - 1), String(oNode.ParentPath)].join("-");
                if (iLevel > 0 && mNodesByLevelPred.has(sParentKey)) {
                    mNodesByLevelPred.get(sParentKey).children.push(oNode);
                } else {
                    aRoots.push(oNode);
                }
            });
            return aRoots;
        },

        _openBomTreeDialog: function () {
            var oView = this.base.getView();

            if (this._oBomTreeDialog && !this._oBomTreeDialog.bIsDestroyed) {
                this._oBomTreeDialog.open();
                return Promise.resolve();
            }
            if (this._oBomTreeDialog && this._oBomTreeDialog.bIsDestroyed) {
                this._oBomTreeDialog = null;
                this._pBomTreeDialog = null;
            }

            if (!this._pBomTreeDialog) {
                this._pBomTreeDialog = Fragment.load({
                    name: "com.cathaydining.zsdi001.ext.fragments.BomTreeView",
                    controller: this
                }).then(function (oDialog) {
                    this._oBomTreeDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                    return oDialog;
                }.bind(this)).catch(function (oError) {
                    this._pBomTreeDialog = null;
                    this._oBomTreeDialog = null;
                    throw oError;
                }.bind(this));
            }
            return this._pBomTreeDialog;
        },

        _mapMaterialContextToRow: async function (oContext) {
            var oData = Object.assign({}, (oContext && oContext.getObject && oContext.getObject()) || {});
            var aEnsureProps = [
                "BillOfMaterial",
                "AlternativeBOM",
                "InternalCounter",
                "OldMaterial",
                "Description",
                "ServiceType",
                "SpecType",
                "AltDescription",
                "SpecTagCategory",
                "CabinClass",
                "CpStatus",
                "Resend",
                "BomEndDate",
                "MaterialStatusDesc",
                "BomStatusDesc"
            ];
            var i;

            for (i = 0; i < aEnsureProps.length; i++) {
                oData[aEnsureProps[i]] = await this._requestContextProperty(oContext, aEnsureProps[i], oData[aEnsureProps[i]]);
            }

            return {
                Material: oData.Material || "",
                OldMaterial: oData.OldMaterial || "",
                SalesOrg: oData.SalesOrg || "",
                DistChannel: oData.DistChannel || "",
                BillOfMaterial: oData.BillOfMaterial || "",
                AlternativeBOM: oData.AlternativeBOM || "",
                InternalCounter: oData.InternalCounter || "",
                MaterialType: oData.MaterialType || "",
                MaterialStatus: oData.MaterialStatus || "",
                MaterialStatusDesc: oData.MaterialStatusDesc || "",
                CabinClass: oData.CabinClass || "",
                BomStatus: oData.BomStatus || "",
                BomStatusDesc: oData.BomStatusDesc || "",
                BomEffectiveDate: oData.BomEffectiveDate || null,
                BomEndDate: oData.BomEndDate || null,
                VaidForm: oData.BomEffectiveDate || oData.VaidForm || null,
                CpStatus: oData.CpStatus || "",
                Resend: !!oData.Resend,
                Description: oData.Description || "",
                AirlineCode: oData.AirlineCode || "",
                SpecType: oData.SpecType || "",
                ServiceType: oData.ServiceType || "",
                AltDescription: oData.AltDescription || "",
                SpecTagCategory: oData.SpecTagCategory || ""
            };
        },

        _requestContextProperty: async function (oContext, sProperty, vFallback) {
            if (vFallback !== undefined && vFallback !== null && vFallback !== "") {
                return vFallback;
            }
            if (!oContext || typeof oContext.requestProperty !== "function") {
                return vFallback;
            }
            try {
                var vValue = await oContext.requestProperty(sProperty);
                return vValue === undefined || vValue === null ? vFallback : vValue;
            } catch (e) {
                return vFallback;
            }
        },

        /**
         * Default: select every row when the Send Spec dialog opens.
         * Do not attach rowsUpdated — MassUpdate/SendToCP also fire it and would re-select all.
         * @private
         */
        _selectAllSendSpecRows: function () {
            var oTable = this._oSendSpecTable;
            var aRows = this._getUiModel().getProperty("/selectedMaterialRows") || [];
            if (!oTable || oTable.bIsDestroyed || !aRows.length) {
                return;
            }
            this._restoreSendSpecSelection(aRows.map(function (_oRow, iIndex) {
                return iIndex;
            }));
        },

        /**
         * Restore selection after setProperty rebind (sync + once on rowsUpdated).
         * @param {number[]} aIndexes
         * @private
         */
        _restoreSendSpecSelectionAfterUpdate: function (aIndexes) {
            var oTable = this._oSendSpecTable;
            var aCopy = (aIndexes || []).slice();
            this._restoreSendSpecSelection(aCopy);
            if (oTable && !oTable.bIsDestroyed && typeof oTable.attachEventOnce === "function") {
                oTable.attachEventOnce("rowsUpdated", function () {
                    this._restoreSendSpecSelection(aCopy);
                }.bind(this));
            }
        },

        /**
         * Restore GridTable / responsive table selection by index after a model rebind.
         * @param {number[]} aIndexes
         * @private
         */
        _restoreSendSpecSelection: function (aIndexes) {
            var oTable = this._oSendSpecTable;
            if (!oTable || oTable.bIsDestroyed) {
                return;
            }
            var aValid = (aIndexes || []).filter(function (iIndex) {
                return typeof iIndex === "number" && iIndex > -1;
            });
            if (typeof oTable.clearSelection === "function") {
                oTable.clearSelection();
            }
            if (!aValid.length) {
                return;
            }
            // GridTable: addSelectionInterval selects the binding range reliably
            if (typeof oTable.addSelectionInterval === "function") {
                aValid.sort(function (a, b) {
                    return a - b;
                });
                var iStart = aValid[0];
                var iPrev = aValid[0];
                for (var i = 1; i < aValid.length; i++) {
                    if (aValid[i] === iPrev + 1) {
                        iPrev = aValid[i];
                        continue;
                    }
                    oTable.addSelectionInterval(iStart, iPrev);
                    iStart = aValid[i];
                    iPrev = aValid[i];
                }
                oTable.addSelectionInterval(iStart, iPrev);
                return;
            }
            if (aValid.length && typeof oTable.selectAll === "function"
                    && aValid.length === ((this._getUiModel().getProperty("/selectedMaterialRows") || []).length)) {
                oTable.selectAll();
                return;
            }
            // Fallback for sap.m.Table
            if (typeof oTable.getItems === "function") {
                var aItems = oTable.getItems() || [];
                aValid.forEach(function (iIndex) {
                    var oItem = aItems[iIndex];
                    if (oItem && typeof oItem.setSelected === "function") {
                        oItem.setSelected(true);
                    }
                });
            }
        },

        _getMassUpdateSelectedIndexes: function () {
            var oTable = this._oSendSpecTable;
            if (!oTable || oTable.bIsDestroyed) {
                return [];
            }
            // sap.ui.table.Table (GridTable)
            if (typeof oTable.getSelectedIndices === "function" && oTable.isA && oTable.isA("sap.ui.table.Table")) {
                return (oTable.getSelectedIndices() || []).filter(function (iIndex) {
                    return iIndex > -1;
                });
            }
            // sap.m.Table (responsive)
            if (typeof oTable.getSelectedItems === "function" && typeof oTable.getItems === "function") {
                var aItems = oTable.getItems() || [];
                return (oTable.getSelectedItems() || []).map(function (oItem) {
                    return aItems.indexOf(oItem);
                }).filter(function (iIndex) {
                    return iIndex > -1;
                });
            }
            return [];
        },

        _getMassUpdateSelectedRows: function () {
            var aSelectedRows = this._getUiModel().getProperty("/selectedMaterialRows") || [];
            return this._getMassUpdateSelectedIndexes().map(function (iIndex) {
                return aSelectedRows[iIndex];
            }).filter(Boolean);
        },

        _getUiModel: function () {
            return this.base.getView().getModel("ui");
        },

        _requestActionResult: async function (oActionBinding) {
            var oBoundContext = oActionBinding && oActionBinding.getBoundContext && oActionBinding.getBoundContext();
            if (oBoundContext) {
                // Prefer already-loaded data after execute(); avoid extra requestProperty
                // on collection returns (often triggers "$batch failed").
                var oCached = oBoundContext.getObject && oBoundContext.getObject();
                if (oCached) {
                    return oCached;
                }
                if (typeof oBoundContext.requestObject === "function") {
                    try {
                        return await oBoundContext.requestObject();
                    } catch (e) {
                        return oBoundContext.getObject && oBoundContext.getObject();
                    }
                }
            }
            if (oActionBinding && oActionBinding.requestObject) {
                return oActionBinding.requestObject();
            }
            return null;
        },

        _normalizeActionResultArray: function (vResult) {
            if (Array.isArray(vResult)) {
                return vResult;
            }
            if (vResult && Array.isArray(vResult.value)) {
                return vResult.value;
            }
            if (vResult && typeof vResult === "object") {
                return [vResult];
            }
            return [];
        },

        /**
         * Reads ZA_SD_INT_MATERIAL_ROOT.Type / Message (and nested _material Type).
         * E/A → error; otherwise success (Message shown when present).
         * @param {object[]} aRootResults Action return roots
         * @returns {{isError: boolean, message: string, type: string}}
         * @private
         */
        _evaluateActionType: function (aRootResults) {
            var aRoots = aRootResults || [];
            var i;
            for (i = 0; i < aRoots.length; i++) {
                var oRoot = aRoots[i] || {};
                var sType = String(oRoot.Type || oRoot.type || "").toUpperCase();
                var sMessage = oRoot.Message || oRoot.Mesage || oRoot.message || "";

                if (sType === "E" || sType === "A") {
                    return { isError: true, message: sMessage, type: sType };
                }

                var aMaterials = Array.isArray(oRoot._material) ? oRoot._material : [];
                var oMatErr = aMaterials.find(function (oMat) {
                    var sMatType = String((oMat && (oMat.Type || oMat.type)) || "").toUpperCase();
                    return sMatType === "E" || sMatType === "A";
                });
                if (oMatErr) {
                    return {
                        isError: true,
                        message: oMatErr.Message || oMatErr.Mesage || oMatErr.message || sMessage,
                        type: String(oMatErr.Type || oMatErr.type || "").toUpperCase()
                    };
                }

                if (sType || sMessage) {
                    return { isError: false, message: sMessage, type: sType };
                }
            }
            return { isError: false, message: "", type: "" };
        },

        _extractActionBusinessError: function (aRootResults) {
            var oResult = this._evaluateActionType(aRootResults);
            return oResult.isError ? (oResult.message || "") : "";
        },

        _toEdmDateValue: function (vValue) {
            if (!vValue) {
                return null;
            }
            if (typeof vValue === "string") {
                // Keep date-only part; drop time / timezone suffix if present.
                var aMatch = String(vValue).match(/(\d{4})-(\d{2})-(\d{2})/);
                return aMatch ? aMatch[1] + "-" + aMatch[2] + "-" + aMatch[3] : vValue;
            }
            if (vValue instanceof Date && !Number.isNaN(vValue.getTime())) {
                // DatePicker is bound with UTC:true → use UTC parts to avoid -1 day.
                return [
                    String(vValue.getUTCFullYear()).padStart(4, "0"),
                    String(vValue.getUTCMonth() + 1).padStart(2, "0"),
                    String(vValue.getUTCDate()).padStart(2, "0")
                ].join("-");
            }
            return String(vValue);
        },

        _extractErrorMessage: function (oError) {
            if (!oError) {
                return this._getText("msgUnknownError");
            }
            // Prefer nested OData / $batch messages when present.
            var aMessages = oError.error && oError.error.details;
            if (Array.isArray(aMessages) && aMessages.length && aMessages[0].message) {
                return aMessages[0].message;
            }
            if (oError.error && oError.error.message) {
                return typeof oError.error.message === "string"
                    ? oError.error.message
                    : (oError.error.message.value || oError.message || this._getText("msgUnknownError"));
            }
            if (oError.cause && oError.cause.message) {
                return oError.cause.message;
            }
            return oError.message || this._getText("msgUnknownError");
        },

        _getText: function (sKey, aArgs) {
            var oI18nModel = this.base.getView().getModel("i18n");
            var oBundle = oI18nModel && oI18nModel.getResourceBundle && oI18nModel.getResourceBundle();
            return oBundle && oBundle.getText ? oBundle.getText(sKey, aArgs) : sKey;
        }
    });
});
