sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/fe/core/controllerextensions/Routing",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/dnd/DragInfo",
    "sap/ui/core/dnd/DropInfo",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/TableSelectDialog",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ResponsivePopover",
    "sap/ui/core/Icon",
    "sap/ui/core/ComponentContainer",
    "sap/ui/core/BusyIndicator",
    "sap/ui/core/Lib",
    "com/cathaydining/zppe025/ext/delegate/EquipmentAssignmentTableDelegate"
], function (ControllerExtension, Routing, Fragment, JSONModel, MessageToast, MessageBox, DragInfo, DropInfo, Filter, FilterOperator, Sorter, TableSelectDialog, Column, ColumnListItem, Text, Dialog, Button, ResponsivePopover, Icon, ComponentContainer, BusyIndicator, Lib, EquipmentTableDelegate) {
    "use strict";

    return ControllerExtension.extend("com.cathaydining.zppe025.ext.controller.ObjectPageExtension", {
        override: {
            routing: {
                onAfterBinding: function (oBindingContext) {
                    if (!oBindingContext) {
                        return;
                    }
                    var oMitTable = this._getMitMdcTable();
                    if (oMitTable) {
                        this._applyColumnVisibility(oBindingContext, oMitTable);
                        this._enableMitDragDrop(oMitTable);
                    }
                    var oGitTable = this._getGitMdcTable();
                    if (oGitTable) {
                        this._enableGitDragDrop(oGitTable);
                    }
                    // Annotation facets + lazy loading: hook layout and inject title icons when sections exist.
                    this._mFormulaHelpAttached = {};
                    this._iFormulaHelpRetry = 0;
                    this._hookFormulaHelpLayout();
                    this._ensureFormulaHelpIcons();
                }
            }
        },

        /**
         * Material Line Item (_Mit) MDC table.
         * @returns {sap.ui.mdc.Table|null}
         * @private
         */
        _getMitMdcTable: function () {
            var oView = this.base.getView();
            var oById = oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Mit::LineItem")
                || oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Mit::SelectionPresentationVariant::table")
                || oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Mit::SelectionPresentationVariant#table::table");
            if (oById) {
                return oById;
            }
            var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA("sap.ui.mdc.Table");
            });
            for (var i = 0; i < aTables.length; i++) {
                var oInner = aTables[i].getAggregation("_content");
                var oBinding = oInner && (oInner.getBinding("items") || oInner.getBinding("rows"));
                if (oBinding && oBinding.getPath && oBinding.getPath() === "_Mit") {
                    return aTables[i];
                }
            }
            return null;
        },

        /**
         * Standard UI5 DnD on Mit GridTable — do not destroy configs after drop.
         * @param {sap.ui.mdc.Table} oMdcTable
         * @private
         */
        _enableMitDragDrop: function (oMdcTable) {
            if (!oMdcTable) {
                return;
            }
            var that = this;
            var fnEnsure = function () {
                that._ensureMitDndConfigs(oMdcTable.getAggregation("_content"));
            };
            if (!oMdcTable.data("mitDndHooked")) {
                oMdcTable.data("mitDndHooked", true);
                oMdcTable.attachEvent("tableUpdated", fnEnsure);
                oMdcTable.addEventDelegate({
                    onAfterRendering: fnEnsure
                });
            }
            fnEnsure();
        },

        /**
         * Add DragInfo/DropInfo once per inner Mit GridTable instance.
         * @param {sap.ui.table.Table} oInnerTable
         * @private
         */
        _ensureMitDndConfigs: function (oInnerTable) {
            if (!oInnerTable || !oInnerTable.isA("sap.ui.table.Table")) {
                return;
            }
            var aConfigs = oInnerTable.getDragDropConfig() || [];
            var bHas = aConfigs.some(function (oConfig) {
                return oConfig.getGroupName && oConfig.getGroupName() === "MitSeq";
            });
            if (bHas) {
                return;
            }

            if (!this._fnMitDrop) {
                this._fnMitDrop = this._onMitRowDrop.bind(this);
            }

            oInnerTable.addDragDropConfig(new DragInfo({
                sourceAggregation: "rows",
                groupName: "MitSeq"
            }));
            oInnerTable.addDragDropConfig(new DropInfo({
                targetAggregation: "rows",
                dropPosition: "Between",
                dropLayout: "Vertical",
                groupName: "MitSeq",
                drop: this._fnMitDrop
            }));
        },

        /**
         * Reorder Mit GridTable rows and renumber Seq (NUMC 3).
         * @param {sap.ui.base.Event} oEvent
         * @private
         */
        _onMitRowDrop: function (oEvent) {
            if (this._bMitReorderBusy) {
                return;
            }

            var oUiModel = this.base.getView().getModel("ui");
            if (oUiModel && oUiModel.getProperty("/editMode") !== "Editable") {
                return;
            }

            var oDraggedRow = oEvent.getParameter("draggedControl");
            var oDroppedRow = oEvent.getParameter("droppedControl");
            var sDropPosition = oEvent.getParameter("dropPosition");
            if (!oDraggedRow || !oDroppedRow || oDraggedRow === oDroppedRow) {
                return;
            }

            var oTable = oDraggedRow.getParent();
            if (!oTable || !oTable.isA("sap.ui.table.Table")) {
                return;
            }

            var oDragCtx = oDraggedRow.getBindingContext && oDraggedRow.getBindingContext();
            var oDropCtx = oDroppedRow.getBindingContext && oDroppedRow.getBindingContext();
            if (!oDragCtx || !oDropCtx) {
                return;
            }

            var oBinding = oTable.getBinding("rows");
            if (!oBinding) {
                return;
            }

            var fnToNumc3 = function (iValue) {
                return ("000" + String(iValue)).slice(-3);
            };
            var fnSameContext = function (oLeft, oRight) {
                if (!oLeft || !oRight) {
                    return false;
                }
                if (oLeft === oRight) {
                    return true;
                }
                return !!(oLeft.getPath && oRight.getPath && oLeft.getPath() === oRight.getPath());
            };

            this._bMitReorderBusy = true;
            var that = this;
            var iLength = typeof oBinding.getLength === "function" ? oBinding.getLength() : 0;
            var pContexts = typeof oBinding.requestContexts === "function"
                ? oBinding.requestContexts(0, iLength || 1000)
                : Promise.resolve(
                    (oBinding.getAllCurrentContexts && oBinding.getAllCurrentContexts())
                    || (oBinding.getCurrentContexts && oBinding.getCurrentContexts())
                    || []
                );

            pContexts.then(function (aContexts) {
                aContexts = (aContexts || []).filter(Boolean);
                var iFrom = -1;
                var iTo = -1;
                var i;
                for (i = 0; i < aContexts.length; i++) {
                    if (fnSameContext(aContexts[i], oDragCtx)) {
                        iFrom = i;
                    }
                    if (fnSameContext(aContexts[i], oDropCtx)) {
                        iTo = i;
                    }
                }
                if (iFrom < 0 || iTo < 0) {
                    return Promise.reject(new Error("Unable to resolve dragged/dropped Mit rows."));
                }

                var aOrdered = aContexts.slice();
                var oMoved = aOrdered.splice(iFrom, 1)[0];
                if (iFrom < iTo) {
                    iTo -= 1;
                }
                if (sDropPosition === "After") {
                    iTo += 1;
                }
                aOrdered.splice(iTo, 0, oMoved);

                return Promise.all(aOrdered.map(function (oCtx, iIndex) {
                    var sNewSeq = fnToNumc3(iIndex + 1);
                    var sOldSeq = fnToNumc3(parseInt(oCtx.getProperty("Seq"), 10) || 0);
                    if (sOldSeq === sNewSeq) {
                        return Promise.resolve();
                    }
                    return oCtx.setProperty("Seq", sNewSeq);
                }));
            }).then(function () {
                return that._requestMitRefresh();
            }).catch(function (oError) {
                var sMsg = (oError && (oError.message || (oError.error && oError.error.message)))
                    || "Failed to update Seq. Ensure Seq is updatable in BDEF.";
                MessageBox.error(sMsg);
            }).finally(function () {
                that._bMitReorderBusy = false;
                setTimeout(function () {
                    var oMdc = that._getMitMdcTable();
                    if (oMdc) {
                        that._ensureMitDndConfigs(oMdc.getAggregation("_content"));
                    }
                }, 500);
            });
        },

        /**
         * Refresh _Mit via OData V4 Side Effects after Seq reorder.
         * @returns {Promise}
         * @private
         */
        _requestMitRefresh: function () {
            var oRootContext = this.base.getView().getBindingContext();
            if (!oRootContext || !oRootContext.requestSideEffects) {
                return Promise.resolve();
            }
            return Promise.resolve(
                oRootContext.requestSideEffects([{ $NavigationPropertyPath: "_Mit" }])
            );
        },

        /**
         * Loading Template Group (_Git) MDC table.
         * @returns {sap.ui.mdc.Table|null}
         * @private
         */
        _getGitMdcTable: function () {
            var oView = this.base.getView();
            var oById = oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Git::LineItem")
                || oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Git::SelectionPresentationVariant::table")
                || oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Git::SelectionPresentationVariant#table::table");
            if (oById) {
                return oById;
            }
            var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA("sap.ui.mdc.Table");
            });
            for (var i = 0; i < aTables.length; i++) {
                var oInner = aTables[i].getAggregation("_content");
                var oBinding = oInner && (oInner.getBinding("items") || oInner.getBinding("rows"));
                if (oBinding && oBinding.getPath && oBinding.getPath() === "_Git") {
                    return aTables[i];
                }
            }
            return null;
        },

        /**
         * Standard UI5 DnD on Git ResponsiveTable.
         * @param {sap.ui.mdc.Table} oMdcTable
         * @private
         */
        _enableGitDragDrop: function (oMdcTable) {
            if (!oMdcTable) {
                return;
            }
            var that = this;
            var fnEnsure = function () {
                that._ensureGitDndConfigs(oMdcTable.getAggregation("_content"));
            };
            if (!oMdcTable.data("gitDndHooked")) {
                oMdcTable.data("gitDndHooked", true);
                oMdcTable.attachEvent("tableUpdated", fnEnsure);
                oMdcTable.addEventDelegate({
                    onAfterRendering: fnEnsure
                });
            }
            fnEnsure();
        },

        /**
         * Add DragInfo/DropInfo once per inner Git ResponsiveTable instance.
         * @param {sap.m.Table} oInnerTable
         * @private
         */
        _ensureGitDndConfigs: function (oInnerTable) {
            if (!oInnerTable || !oInnerTable.isA("sap.m.Table")) {
                return;
            }
            var aConfigs = oInnerTable.getDragDropConfig() || [];
            var bHas = aConfigs.some(function (oConfig) {
                return oConfig.getGroupName && oConfig.getGroupName() === "GitSeq";
            });
            if (bHas) {
                return;
            }

            if (!this._fnGitDrop) {
                this._fnGitDrop = this._onGitRowDrop.bind(this);
            }

            oInnerTable.addDragDropConfig(new DragInfo({
                sourceAggregation: "items",
                groupName: "GitSeq"
            }));
            oInnerTable.addDragDropConfig(new DropInfo({
                targetAggregation: "items",
                dropPosition: "Between",
                dropLayout: "Vertical",
                groupName: "GitSeq",
                drop: this._fnGitDrop
            }));
        },

        /**
         * Reorder Git ResponsiveTable items and renumber Seq (NUMC 3).
         * @param {sap.ui.base.Event} oEvent
         * @private
         */
        _onGitRowDrop: function (oEvent) {
            if (this._bGitReorderBusy) {
                return;
            }

            var oUiModel = this.base.getView().getModel("ui");
            if (oUiModel && oUiModel.getProperty("/editMode") !== "Editable") {
                return;
            }

            var oDraggedRow = oEvent.getParameter("draggedControl");
            var oDroppedRow = oEvent.getParameter("droppedControl");
            var sDropPosition = oEvent.getParameter("dropPosition");
            if (!oDraggedRow || !oDroppedRow || oDraggedRow === oDroppedRow) {
                return;
            }

            var oTable = oDraggedRow.getParent();
            if (!oTable || !oTable.isA("sap.m.Table")) {
                return;
            }

            var oDragCtx = oDraggedRow.getBindingContext && oDraggedRow.getBindingContext();
            var oDropCtx = oDroppedRow.getBindingContext && oDroppedRow.getBindingContext();
            if (!oDragCtx || !oDropCtx) {
                return;
            }

            var oBinding = oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            var fnToNumc3 = function (iValue) {
                return ("000" + String(iValue)).slice(-3);
            };
            var fnSameContext = function (oLeft, oRight) {
                if (!oLeft || !oRight) {
                    return false;
                }
                if (oLeft === oRight) {
                    return true;
                }
                return !!(oLeft.getPath && oRight.getPath && oLeft.getPath() === oRight.getPath());
            };

            this._bGitReorderBusy = true;
            var that = this;
            var iLength = typeof oBinding.getLength === "function" ? oBinding.getLength() : 0;
            var pContexts = typeof oBinding.requestContexts === "function"
                ? oBinding.requestContexts(0, iLength || 1000)
                : Promise.resolve(
                    (oBinding.getAllCurrentContexts && oBinding.getAllCurrentContexts())
                    || (oBinding.getCurrentContexts && oBinding.getCurrentContexts())
                    || []
                );

            pContexts.then(function (aContexts) {
                aContexts = (aContexts || []).filter(Boolean);
                var iFrom = -1;
                var iTo = -1;
                var i;
                for (i = 0; i < aContexts.length; i++) {
                    if (fnSameContext(aContexts[i], oDragCtx)) {
                        iFrom = i;
                    }
                    if (fnSameContext(aContexts[i], oDropCtx)) {
                        iTo = i;
                    }
                }
                if (iFrom < 0 || iTo < 0) {
                    return Promise.reject(new Error("Unable to resolve dragged/dropped Git rows."));
                }

                var aOrdered = aContexts.slice();
                var oMoved = aOrdered.splice(iFrom, 1)[0];
                if (iFrom < iTo) {
                    iTo -= 1;
                }
                if (sDropPosition === "After") {
                    iTo += 1;
                }
                aOrdered.splice(iTo, 0, oMoved);

                return Promise.all(aOrdered.map(function (oCtx, iIndex) {
                    var sNewSeq = fnToNumc3(iIndex + 1);
                    var sOldSeq = fnToNumc3(parseInt(oCtx.getProperty("Seq"), 10) || 0);
                    if (sOldSeq === sNewSeq) {
                        return Promise.resolve();
                    }
                    return oCtx.setProperty("Seq", sNewSeq);
                }));
            }).then(function () {
                return that._requestGitRefresh();
            }).catch(function (oError) {
                var sMsg = (oError && (oError.message || (oError.error && oError.error.message)))
                    || "Failed to update Seq. Ensure Seq is updatable in BDEF.";
                MessageBox.error(sMsg);
            }).finally(function () {
                that._bGitReorderBusy = false;
                setTimeout(function () {
                    var oMdc = that._getGitMdcTable();
                    if (oMdc) {
                        that._ensureGitDndConfigs(oMdc.getAggregation("_content"));
                    }
                }, 500);
            });
        },

        /**
         * Refresh _Git via OData V4 Side Effects after Seq reorder.
         * @returns {Promise}
         * @private
         */
        _requestGitRefresh: function () {
            var oRootContext = this.base.getView().getBindingContext();
            if (!oRootContext || !oRootContext.requestSideEffects) {
                return Promise.resolve();
            }
            return Promise.resolve(
                oRootContext.requestSideEffects([{ $NavigationPropertyPath: "_Git" }])
            );
        },

        _applyColumnVisibility: function (oHeaderContext, oMdcTable) {
            Promise.all([
                oHeaderContext.requestProperty("LdgTempType"),
                oHeaderContext.requestProperty("AirlineCode")
            ]).then(function (aVals) {
                var sType = aVals[0];
                var sAirline = aVals[1];
                var mVisibleByType = {
                    A: ["Seq", "CustomSeqColumn", "AcftType", "GalleyVersion", "HandleType", "Matnr"],
                    S: ["Seq", "CustomSeqColumn", "DishType", "Matnr", "DistribFlag", "TemDistribKey", "LoadEquip", "ServEquip", "ZapprStatus", "ZitmEqCode", "Relsale", "Relprod"],
                    P: ["Seq", "CustomSeqColumn", "AcftType", "GalleyVersion", "DishType", "Matnr", "Choice", "CalcCode", "CalcGrp", "CalcParam", "CalcMax","CalcMin","LoadEquip", "ServEquip", "ZapprStatus",
                        "ZitmEqCode", "LidColor", "SpmlDedu", "DistribFlag", "TemDistribKey", "PreordSlctCode", "Relsale", "Relprod"],
                    D: null,
                    G: null,
                    M: null
                };
                // Frontend mandatory * from Mit~check_value (annotation FieldControl ineffective on table headers)
                var mRequiredByType = {
                    A: ["Matnr", "AcftType", "GalleyVersion", "HandleType"],
                    S: ["Matnr"],
                    P: ["Matnr", "SpmlDedu"]
                };
                var aVisible = mVisibleByType[sType];
                var aRequired = (mRequiredByType[sType] || []).slice();
                // P + CX: CalcCode is mandatory in Mit~check_value
                if (sType === "P" && sAirline === "CX" && aRequired.indexOf("CalcCode") === -1) {
                    aRequired.push("CalcCode");
                }

                var oInnerTable = oMdcTable.getAggregation("_content");
                if (!oInnerTable) {
                    return;
                }

                var aMdcColumns = oMdcTable.getColumns();
                var aInnerColumns = oInnerTable.getColumns();
                var iOffset = Math.max(0, aInnerColumns.length - aMdcColumns.length);

                aInnerColumns.forEach(function (oInnerCol, iIndex) {
                    var iMdcIndex = iIndex - iOffset;
                    if (iMdcIndex < 0) {
                        return;
                    }
                    var oMdcCol = aMdcColumns[iMdcIndex];
                    var sFieldName = oMdcCol && this._getColumnFieldName(oMdcCol);

                    if (!sFieldName) {
                        return;
                    }

                    // Read-only custom Seq column must stay visible when Seq is in the type layout
                    if (this._isSeqColumn(sFieldName, oMdcCol)) {
                        oInnerCol.setVisible(!aVisible || aVisible.indexOf("Seq") !== -1 || aVisible.indexOf("CustomSeqColumn") !== -1);
                        this._setColumnRequired(oInnerCol, oMdcCol, false);
                        return;
                    }

                    if (!aVisible) {
                        oInnerCol.setVisible(true);
                    } else {
                        oInnerCol.setVisible(aVisible.indexOf(sFieldName) !== -1);
                    }

                    var bRequired = aRequired.indexOf(sFieldName) !== -1
                        || aRequired.indexOf(this._normalizeMitFieldName(sFieldName)) !== -1;
                    this._setColumnRequired(oInnerCol, oMdcCol, bRequired);
                }.bind(this));
            }.bind(this));
        },

        /**
         * Map MDC property keys to logical Mit field names used in required lists.
         * @param {string} sFieldName
         * @returns {string}
         * @private
         */
        _normalizeMitFieldName: function (sFieldName) {
            if (!sFieldName) {
                return sFieldName;
            }
            if (sFieldName === "matnr" || sFieldName === "Matnr") {
                return "Matnr";
            }
            return sFieldName;
        },

        /**
         * Show / hide mandatory asterisk on Mit table column header (frontend control).
         * Supports MDC Column, ResponsiveTable (sap.m.Column) and GridTable (sap.ui.table.Column).
         * @param {sap.ui.core.Element} oInnerCol
         * @param {sap.ui.mdc.table.Column} oMdcCol
         * @param {boolean} bRequired
         * @private
         */
        _setColumnRequired: function (oInnerCol, oMdcCol, bRequired) {
            if (oMdcCol && typeof oMdcCol.setRequired === "function") {
                oMdcCol.setRequired(!!bRequired);
            }
            var oHeader = oInnerCol && oInnerCol.getHeader && oInnerCol.getHeader();
            if (oHeader && typeof oHeader.setRequired === "function") {
                oHeader.setRequired(!!bRequired);
            }
            var oLabel = oInnerCol && oInnerCol.getLabel && oInnerCol.getLabel();
            if (oLabel && typeof oLabel.setRequired === "function") {
                oLabel.setRequired(!!bRequired);
            }
        },

        _getColumnFieldName: function (oMdcColumn) {
            var sKey = oMdcColumn.getPropertyKey && oMdcColumn.getPropertyKey();

            if (sKey) {
                var aParts = sKey.split("/");
                return aParts[aParts.length - 1];
            }

            return undefined;
        },

        /**
         * @param {string} sFieldName
         * @param {sap.ui.mdc.TableColumn} oMdcColumn
         * @returns {boolean}
         * @private
         */
        _isSeqColumn: function (sFieldName, oMdcColumn) {
            if (sFieldName === "Seq" || sFieldName === "CustomSeqColumn") {
                return true;
            }
            var sKey = oMdcColumn && oMdcColumn.getPropertyKey && oMdcColumn.getPropertyKey();
            return !!(sKey && sKey.indexOf("CustomSeqColumn") !== -1);
        },

        /**
        * Generated event handler.
        *
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        visibleForPreviewCalculationBtn: function (oBindingContext) {
            if (oBindingContext) {
                return oBindingContext.requestObject("LdgTempType").then(function (sStatus) {
                    return sStatus === "P";
                });
            } else {
                return false;
            }
        },

        /**
        * Generated event handler.
        *
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        visibleForRecurringSettingBtn: function (oBindingContext) {
            if (oBindingContext) {
                return oBindingContext.requestObject("LdgTempType").then(function (sStatus) {
                    return sStatus === "G";
                });
            } else {
                return false;
            }
        },

        /**
        * Generated event handler.
        *
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        visibleForAssignLoadingEquimentBtn: function (oBindingContext) {
            if (oBindingContext) {
                return oBindingContext.requestObject("LdgTempType").then(function (sStatus) {
                    return sStatus === "P" || sStatus === "S";
                });
            } else {
                return false;
            }
        },

        /**
* Generated event handler.
*
* @param oContext the context of the page on which the event was fired. `undefined` for list report page.
*/
        visibleForAssignServingEquimentBtn: function (oBindingContext) {
            if (oBindingContext) {
                return oBindingContext.requestObject("LdgTempType").then(function (sStatus) {
                    return sStatus === "P" || sStatus === "S";
                });
            } else {
                return false;
            }
        },


        /**
         * @param {string} sText
         * @returns {string}
         * @private
         */
        _normalizeTitleText: function (sText) {
            return String(sText || "").replace(/\s+/g, " ").trim().toLowerCase();
        },

        /**
         * Keep re-trying on ObjectPageLayout re-render / section change (lazy loading).
         * @private
         */
        _hookFormulaHelpLayout: function () {
            var oView = this.base.getView();
            var that = this;
            var aLayouts = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA && oCtrl.isA("sap.uxap.ObjectPageLayout");
            });
            aLayouts.forEach(function (oLayout) {
                if (oLayout.data("formulaHelpHooked")) {
                    return;
                }
                oLayout.data("formulaHelpHooked", true);
                oLayout.addEventDelegate({
                    onAfterRendering: function () {
                        that._ensureFormulaHelpIcons();
                    }
                });
                if (typeof oLayout.attachSectionChange === "function") {
                    oLayout.attachSectionChange(function () {
                        that._ensureFormulaHelpIcons();
                    });
                }
            });
        },

        /**
         * Icon-only control (no "Formula" text). Popover title still uses Formula.
         * @param {string} sKey
         * @returns {sap.ui.core.Icon}
         * @private
         */
        _getFormulaHelpIcon: function (sKey) {
            var oView = this.base.getView();
            this._mFormulaHelpIcons = this._mFormulaHelpIcons || {};
            var oIcon = this._mFormulaHelpIcons[sKey];
            if (!oIcon || oIcon.bIsDestroyed) {
                var oBundle = oView.getModel("i18n").getResourceBundle();
                oIcon = new Icon({
                    src: "sap-icon://message-information",
                    decorative: false,
                    tooltip: oBundle.getText("Formula"),
                    press: this.onFormulaHelpPress.bind(this)
                });
                oIcon.addStyleClass("zppe025FormulaHelpIcon");
                this._mFormulaHelpIcons[sKey] = oIcon;
                oView.addDependent(oIcon);
            }
            return oIcon;
        },

        /**
         * Resolve title text from control property or rendered DOM.
         * @param {sap.ui.core.Control} oCtrl
         * @returns {string}
         * @private
         */
        _getControlTitleText: function (oCtrl) {
            var sText = "";
            if (oCtrl.getText) {
                sText = oCtrl.getText() || "";
            }
            if (!sText && oCtrl.getDomRef) {
                var oDom = oCtrl.getDomRef();
                if (oDom) {
                    sText = oDom.textContent || "";
                }
            }
            return this._normalizeTitleText(sText);
        },

        /**
         * Insert icon immediately after the title (left side, before spacer / Create Delete).
         * Supports OverflowToolbar content and MDC ActionToolbar "begin" aggregation (Spe table).
         * @param {sap.ui.core.Control} oTitleCtrl
         * @param {string} sKey
         * @returns {boolean}
         * @private
         */
        _insertIconAfterTitleControl: function (oTitleCtrl, sKey) {
            if (!oTitleCtrl) {
                return false;
            }
            var oIcon = this._getFormulaHelpIcon(sKey);
            var oParent = oTitleCtrl.getParent();
            var oToolbar = oParent;
            while (oToolbar && !(
                oToolbar.isA("sap.ui.mdc.ActionToolbar")
                || oToolbar.isA("sap.m.OverflowToolbar")
                || oToolbar.isA("sap.m.Toolbar")
            )) {
                oToolbar = oToolbar.getParent();
            }

            // MDC table header: title lives in ActionToolbar#begin (not content).
            if (oToolbar && oToolbar.isA("sap.ui.mdc.ActionToolbar") && typeof oToolbar.getBegin === "function") {
                var aBegin = oToolbar.getBegin() || [];
                var iBeginTitle = aBegin.indexOf(oTitleCtrl);
                if (iBeginTitle < 0 && oParent && oParent !== oToolbar) {
                    iBeginTitle = aBegin.indexOf(oParent);
                }
                if (iBeginTitle >= 0) {
                    var iBeginIcon = aBegin.indexOf(oIcon);
                    if (iBeginIcon === iBeginTitle + 1) {
                        this._mFormulaHelpAttached[sKey] = true;
                        return true;
                    }
                    if (iBeginIcon >= 0) {
                        oToolbar.removeBegin(oIcon);
                    }
                    oToolbar.insertBegin(oIcon, iBeginTitle + 1);
                    this._mFormulaHelpAttached[sKey] = true;
                    return true;
                }
            }

            if (oToolbar && typeof oToolbar.indexOfContent === "function") {
                var iTitleIdx = oToolbar.indexOfContent(oTitleCtrl);
                if (iTitleIdx < 0 && oParent && oParent !== oToolbar) {
                    iTitleIdx = oToolbar.indexOfContent(oParent);
                }
                if (iTitleIdx >= 0) {
                    var iIconIdx = oToolbar.indexOfContent(oIcon);
                    if (iIconIdx === iTitleIdx + 1) {
                        this._mFormulaHelpAttached[sKey] = true;
                        return true;
                    }
                    if (iIconIdx >= 0) {
                        oToolbar.removeContent(oIcon);
                    }
                    oToolbar.insertContent(oIcon, iTitleIdx + 1);
                    this._mFormulaHelpAttached[sKey] = true;
                    return true;
                }
            }

            // Section title: rendered in header div (not toolbar).
            var oTitleDom = oTitleCtrl.getDomRef && oTitleCtrl.getDomRef();
            if (!oTitleDom || !oTitleDom.parentNode) {
                return false;
            }
            if (oTitleDom.nextElementSibling && oTitleDom.nextElementSibling.classList
                && oTitleDom.nextElementSibling.classList.contains("zppe025FormulaHelpIcon")) {
                this._mFormulaHelpAttached[sKey] = true;
                return true;
            }
            var iIdx = Array.prototype.indexOf.call(oTitleDom.parentNode.children, oTitleDom);
            oIcon.placeAt(oTitleDom.parentNode, iIdx < 0 ? "last" : iIdx + 1);
            this._mFormulaHelpAttached[sKey] = true;
            return true;
        },

        /**
         * Spec Tag is a table facet — title often sits in MDC ActionToolbar begin.
         * @param {string} sSpeNorm
         * @returns {boolean}
         * @private
         */
        _attachFormulaHelpForSpeTable: function (sSpeNorm) {
            if (this._mFormulaHelpAttached.SpeTable) {
                return true;
            }
            var oView = this.base.getView();
            var aSpeHosts = oView.findAggregatedObjects(true, function (oCtrl) {
                var sId = oCtrl.getId && oCtrl.getId() || "";
                return sId.indexOf("SpeTable") >= 0 || sId.indexOf("_Spe") >= 0;
            });
            var that = this;
            var bDone = false;

            aSpeHosts.forEach(function (oHost) {
                if (bDone) {
                    return;
                }
                // Prefer titles inside this host (section / table).
                var aTitles = oHost.findAggregatedObjects
                    ? oHost.findAggregatedObjects(true, function (oCtrl) {
                        return oCtrl.isA && oCtrl.isA("sap.m.Title");
                    })
                    : [];
                aTitles.forEach(function (oTitleCtrl) {
                    if (bDone) {
                        return;
                    }
                    var sText = that._getControlTitleText(oTitleCtrl);
                    if (sText === sSpeNorm || sText.indexOf(sSpeNorm) === 0 || !sText) {
                        // Empty text: still try if only one title in Spe host toolbar begin.
                        if (!sText) {
                            var oParent = oTitleCtrl.getParent();
                            if (!(oParent && oParent.isA && oParent.isA("sap.ui.mdc.ActionToolbar"))) {
                                return;
                            }
                        }
                        if (that._insertIconAfterTitleControl(oTitleCtrl, "SpeTable")) {
                            bDone = true;
                        }
                    }
                });

                if (!bDone && oHost._getTitleControl) {
                    bDone = that._insertIconAfterTitleControl(oHost._getTitleControl(), "SpeTable");
                }

                // Last resort: first Title in ActionToolbar#begin under Spe host.
                if (!bDone) {
                    var aToolbars = oHost.findAggregatedObjects
                        ? oHost.findAggregatedObjects(true, function (oCtrl) {
                            return oCtrl.isA && oCtrl.isA("sap.ui.mdc.ActionToolbar");
                        })
                        : [];
                    aToolbars.forEach(function (oTb) {
                        if (bDone || typeof oTb.getBegin !== "function") {
                            return;
                        }
                        var aBegin = oTb.getBegin() || [];
                        for (var i = 0; i < aBegin.length; i++) {
                            if (aBegin[i].isA && aBegin[i].isA("sap.m.Title")) {
                                if (that._insertIconAfterTitleControl(aBegin[i], "SpeTable")) {
                                    bDone = true;
                                }
                                break;
                            }
                        }
                    });
                }
            });

            return bDone;
        },

        /**
         * Find visible section titles by text and put info icon immediately to their right.
         * @private
         */
        _ensureFormulaHelpIcons: function () {
            var oView = this.base.getView();
            var oBundle = oView.getModel("i18n").getResourceBundle();
            var sSupp = this._normalizeTitleText(oBundle.getText("SupplementaryInformation"));
            var sSpe = this._normalizeTitleText(oBundle.getText("SpecTagAssignment"));
            this._mFormulaHelpAttached = this._mFormulaHelpAttached || {};
            // Re-render may drop the icon — allow re-insert when not in DOM.
            ["Supplementary", "SpeTable"].forEach(function (sKey) {
                var oIcon = this._mFormulaHelpIcons && this._mFormulaHelpIcons[sKey];
                if (!oIcon || oIcon.bIsDestroyed || !oIcon.getParent()) {
                    this._mFormulaHelpAttached[sKey] = false;
                }
            }.bind(this));
            this._hookFormulaHelpLayout();

            var aTitles = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA && oCtrl.isA("sap.m.Title");
            });

            // Remove leftover right-side actions from earlier addAction attempts.
            var aHosts = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA && (
                    oCtrl.isA("sap.uxap.ObjectPageSection")
                    || oCtrl.isA("sap.uxap.ObjectPageSubSection")
                );
            });
            aHosts.forEach(function (oHost) {
                if (typeof oHost.getActions !== "function") {
                    return;
                }
                oHost.getActions().slice().forEach(function (oAct) {
                    if (oAct && oAct.hasStyleClass && oAct.hasStyleClass("zppe025FormulaHelpIcon")) {
                        oHost.removeAction(oAct);
                        oAct.destroy();
                    }
                });
            });

            aTitles.forEach(function (oTitleCtrl) {
                if (!oTitleCtrl.getVisible || !oTitleCtrl.getVisible()) {
                    return;
                }
                var sText = this._getControlTitleText(oTitleCtrl);
                var oDom = oTitleCtrl.getDomRef && oTitleCtrl.getDomRef();
                if (oDom && oDom.offsetParent === null) {
                    return; // not visible
                }
                if ((sText === sSupp || sText.indexOf(sSupp) === 0) && !this._mFormulaHelpAttached.Supplementary) {
                    this._insertIconAfterTitleControl(oTitleCtrl, "Supplementary");
                } else if ((sText === sSpe || sText.indexOf(sSpe) === 0) && !this._mFormulaHelpAttached.SpeTable) {
                    this._insertIconAfterTitleControl(oTitleCtrl, "SpeTable");
                }
            }.bind(this));

            // Fallback: ObjectPageSection/SubSection._getTitleControl when Title text not yet resolved.
            aHosts.forEach(function (oHost) {
                var sId = oHost.getId() || "";
                var sTitle = this._normalizeTitleText(oHost.getTitle && oHost.getTitle());
                var sKey = null;
                if (sId.indexOf("SpeTable") >= 0 || sTitle === sSpe) {
                    sKey = "SpeTable";
                } else if (sId.indexOf("Collection3") >= 0 || sId.indexOf("SubCollection3-1") >= 0
                    || sId.indexOf("Group2") >= 0 || sTitle === sSupp) {
                    sKey = "Supplementary";
                }
                if (!sKey || this._mFormulaHelpAttached[sKey]) {
                    return;
                }
                var oTitleCtrl = oHost._getTitleControl && oHost._getTitleControl();
                if (oTitleCtrl) {
                    this._insertIconAfterTitleControl(oTitleCtrl, sKey);
                }
            }.bind(this));

            // Spec Tag table facet: title is usually in MDC ActionToolbar begin next to Create/Delete.
            if (!this._mFormulaHelpAttached.SpeTable) {
                this._attachFormulaHelpForSpeTable(sSpe);
            }

            if ((!this._mFormulaHelpAttached.SpeTable || !this._mFormulaHelpAttached.Supplementary)
                && (this._iFormulaHelpRetry || 0) < 40) {
                this._iFormulaHelpRetry = (this._iFormulaHelpRetry || 0) + 1;
                var that = this;
                setTimeout(function () {
                    that._ensureFormulaHelpIcons();
                }, 500);
            }
        },

        /**
         * Opens Formula help popover next to Supplementary Information / Spec Tag Assignment section actions.
         * @param {sap.ui.base.Event} oEvent press event from the section action
         */
        onFormulaHelpPress: function (oEvent) {
            var oView = this.base.getView();
            var oOpener = oEvent && typeof oEvent.getSource === "function" ? oEvent.getSource() : null;
            if (!oOpener) {
                return;
            }
            var oBundle = oView.getModel("i18n").getResourceBundle();
            var sTitle = oBundle.getText("Formula");
            var sHelpText = oBundle.getText("FormulaHelpText");
            if (!this._oFormulaHelpPopover) {
                this._oFormulaHelpPopover = new ResponsivePopover({
                    title: sTitle,
                    contentWidth: "22rem",
                    showHeader: true,
                    placement: "PreferredRightOrFlip",
                    content: [
                        new Text({
                            text: sHelpText
                        }).addStyleClass("sapUiSmallMargin")
                    ]
                });
                oView.addDependent(this._oFormulaHelpPopover);
            } else {
                this._oFormulaHelpPopover.setTitle(sTitle);
                var aContent = this._oFormulaHelpPopover.getContent();
                if (aContent && aContent[0] && aContent[0].setText) {
                    aContent[0].setText(sHelpText);
                }
            }
            this._oFormulaHelpPopover.openBy(oOpener);
        },

        /**
        * Opens the Preview Calculation dialog.
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        onPreviewCalculation: function (oContext) {
            var oView = this.base.getView();
            if (!this._oPreviewDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.cathaydining.zppe025.ext.fragment.PreviewCalculationDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oPreviewDialog = oDialog;
                    oView.addDependent(oDialog);
                    var oPreviewModel = new JSONModel({
                        DepartureDate: "",
                        CalcBase: "",
                        SeatConfiguration: "",
                        AcftType: "",
                        GalleyVersion: "",
                        results: []
                    });
                    oDialog.setModel(oPreviewModel, "previewModel");
                    return this._prefillDialogFromContext(oContext);
                }.bind(this)).then(function () {
                    this._oPreviewDialog.open();
                }.bind(this));
            } else {
                this._prefillDialogFromContext(oContext).then(function () {
                    this._oPreviewDialog.open();
                }.bind(this));
            }
        },

        _prefillDialogFromContext: function (oContext) {
            if (!this._oPreviewDialog) {
                this._sPreviewAirlineCode = "";
                return Promise.resolve();
            }
            var oModel = this._oPreviewDialog.getModel("previewModel");
            oModel.setProperty("/AcftType", "");
            oModel.setProperty("/GalleyVersion", "");
            oModel.setProperty("/DepartureDate", "");
            oModel.setProperty("/CalcBase", "");
            oModel.setProperty("/SeatConfiguration", "");
            oModel.setProperty("/results", []);

            if (!oContext) {
                this._sPreviewAirlineCode = "";
                return Promise.resolve();
            }

            return oContext.requestProperty("AirlineCode").then(function (sAirlineCode) {
                this._sPreviewAirlineCode = sAirlineCode || "";
            }.bind(this)).catch(function () {
                this._sPreviewAirlineCode = "";
            }.bind(this));
        },

        onPreviewGo: async function () {
            var oPrevModel = this._oPreviewDialog.getModel("previewModel");
            var sDepartureDate = oPrevModel.getProperty("/DepartureDate");
            var sCalcBase = oPrevModel.getProperty("/CalcBase");
            var sSeatConfig = oPrevModel.getProperty("/SeatConfiguration");
            var sAcftType = oPrevModel.getProperty("/AcftType");
            var sGalleyVersion = oPrevModel.getProperty("/GalleyVersion");
            var oView = this.base.getView();
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();
            var oODataModel = oView.getModel();
            var oBindingContext = oView.getBindingContext();

            if (!sDepartureDate || !sCalcBase || !sSeatConfig) {
                MessageToast.show(oResourceBundle.getText("RequiredFieldsMissing"));
                return;
            }

            if (!oBindingContext) {
                MessageToast.show(oResourceBundle.getText("PreviewQueryFailed"));
                return;
            }

            this._oPreviewDialog.setBusy(true);

            try {
                var oActionBinding = oODataModel.bindContext(
                    "com.sap.gateway.srvd.zsd_pp_ldgtemp_hdr.v0001.PreviewCalculation(...)",
                    oBindingContext
                );
                oActionBinding.setParameter("DepartureDate", sDepartureDate);
                oActionBinding.setParameter("BasePaxCount", parseInt(sCalcBase, 10) || 0);
                oActionBinding.setParameter("SeatConfiguration", parseInt(sSeatConfig, 10) || 0);
                oActionBinding.setParameter("AcType", sAcftType || "");
                oActionBinding.setParameter("GalleyVersion", sGalleyVersion || "");
                await oActionBinding.execute();

                var oResult = oActionBinding.getBoundContext().getObject();
                var sJsonResults = oResult && oResult.Results ? oResult.Results : "[]";
                var aRawResults = JSON.parse(sJsonResults);
                var aResults = aRawResults.map(function (oItem) {
                    return {
                        DishType: oItem.zdishType || "",
                        Matnr: oItem.matnr || "",
                        MaterialDescription: oItem.maktx || "",
                        Choice: oItem.zchoice || "",
                        CalcQty: oItem.zcalqty || 0
                    };
                });
                oPrevModel.setProperty("/results", aResults);
                MessageToast.show(oResourceBundle.getText("PreviewResultCount", [aResults.length]));
            } catch (oError) {
                MessageToast.show(oError && oError.message ? oError.message : oResourceBundle.getText("PreviewQueryFailed"));
            } finally {
                this._oPreviewDialog.setBusy(false);
            }
        },

        onPreviewClose: function () {
            if (this._oPreviewDialog) {
                this._oPreviewDialog.close();
            }
        },

        /**
        * Opens the Loading Equipment Assignment dialog.
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        onAssignLoadingEquiment: function (oContext) {
            this._openEquipmentAssignmentDialog("Loading", "LoadingEquipmentAssignment");
        },

        /**
        * Opens the Serving Equipment Assignment dialog.
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        onAssignServingEquiment: function (oContext) {
            this._openEquipmentAssignmentDialog("Serving", "ServingEquipmentAssignment");
        },

        /**
        * Adds a new row to the equipment assignment table.
        * Creates a draft child entity through the parent navigation binding.
        */
        onEquipmentAddRow: function () {
            var oInfo = this._getEquipmentDialogInfo(this._sEquipmentType);
            var oMdcTable = this.base.getView().byId(oInfo.tableId);
            var oRowBinding = oMdcTable && oMdcTable.getRowBinding && oMdcTable.getRowBinding();
            if (!oRowBinding) {
                return;
            }
            oRowBinding.create({
                Matnr: "",
                Quantity: 0
            });
        },

        /**
        * Removes a row from the equipment assignment table.
        * @param oEvent the link press event.
        */
        onEquipmentRemoveRow: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            if (!oCtx) {
                return;
            }
            oCtx.delete(this._getEquipmentUpdateGroupId()).catch(function () { });
        },

        /**
        * Opens the material value help for the Matnr inputs of the loading and
        * serving equipment dialogs. The dialog reads from I_ProductByPlantVH,
        * which is exposed as an entity set of the main service.
        * @param oEvent the valueHelpRequest event of the Matnr input.
        */
        onEquipmentMatnrValueHelp: function (oEvent) {
            var oView = this.base.getView();
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();

            // Remember which input triggered the value help so the selected
            // product can be written back to the correct table row.
            this._oMatnrVhInput = oEvent.getSource();

            var fnOpen = function () {
                this._oProductVhDialog.setModel(new JSONModel({
                    title: oResourceBundle.getText("SelectMaterialNumber"),
                    filterProduct: this._oMatnrVhInput.getValue() || "",
                    filterProductText: "",
                    filterPlant: "",
                    filtersVisible: true,
                    filterToggleText: oResourceBundle.getText("HideFilters")
                }), "productVhModel");
                this._oProductVhDialog.open();
                this._applyProductValueHelpFilters();
            }.bind(this);

            if (!this._oProductVhDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "com.cathaydining.zppe025.ext.fragment.ProductValueHelpDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oProductVhDialog = oDialog;
                    oView.addDependent(oDialog);
                    fnOpen();
                }.bind(this));
            } else {
                fnOpen();
            }
        },

        onProductValueHelpGo: function () {
            this._applyProductValueHelpFilters();
        },

        onProductValueHelpToggleFilters: function () {
            var oResourceBundle = this.base.getView().getModel("i18n").getResourceBundle();
            var oVhModel = this._oProductVhDialog.getModel("productVhModel");
            var bVisible = !oVhModel.getProperty("/filtersVisible");
            oVhModel.setProperty("/filtersVisible", bVisible);
            oVhModel.setProperty("/filterToggleText",
                oResourceBundle.getText(bVisible ? "HideFilters" : "ShowFilters"));
        },

        /**
        * Writes the selected product back into the row that opened the value
        * help. The row context belongs to the equipment table binding, so the
        * change is queued in its dedicated update group and is only persisted
        * on Confirm.
        * @param oEvent the itemPress event of the value help table.
        */
        onProductValueHelpSelect: function (oEvent) {
            var oListItem = oEvent.getParameter("listItem");
            var oItemCtx = oListItem && oListItem.getBindingContext();
            if (!oItemCtx || !this._oMatnrVhInput) {
                return;
            }

            var sProduct = oItemCtx.getProperty("Product");
            var oRowCtx = this._oMatnrVhInput.getBindingContext();
            if (oRowCtx) {
                oRowCtx.setProperty("Matnr", sProduct);
            } else {
                this._oMatnrVhInput.setValue(sProduct);
            }

            this._oProductVhDialog.close();
        },

        onProductValueHelpCancel: function () {
            if (this._oProductVhDialog) {
                this._oProductVhDialog.close();
            }
        },

        _applyProductValueHelpFilters: function () {
            var oTable = this.base.getView().byId("productVhTable");
            var oBinding = oTable && oTable.getBinding("items");
            if (!oBinding) {
                return;
            }

            var oFilterData = this._oProductVhDialog.getModel("productVhModel").getData();
            var aFilters = [];
            if (oFilterData.filterProduct) {
                aFilters.push(new Filter("Product", FilterOperator.Contains,
                    oFilterData.filterProduct.toUpperCase()));
            }
            if (oFilterData.filterProductText) {
                aFilters.push(new Filter("Product_Text", FilterOperator.Contains,
                    oFilterData.filterProductText));
            }
            if (oFilterData.filterPlant) {
                aFilters.push(new Filter("Plant", FilterOperator.Contains,
                    oFilterData.filterPlant.toUpperCase()));
            }

            // The binding is created suspended so no request is sent before the
            // user triggers the first search.
            oBinding.filter(aFilters);
            if (oBinding.isSuspended()) {
                oBinding.resume();
            }
        },

        _getEquipmentUpdateGroupId: function () {
            var oInfo = this._getEquipmentDialogInfo(this._sEquipmentType);
            var oMdcTable = this.base.getView().byId(oInfo.tableId);
            var oRowBinding = oMdcTable && oMdcTable.getRowBinding && oMdcTable.getRowBinding();
            return oRowBinding && oRowBinding.getUpdateGroupId ? oRowBinding.getUpdateGroupId() : "$auto";
        },

        /**
        * Confirms the equipment assignment: submits the queued draft changes
        * (created/deleted/modified equipment rows) and closes the dialog.
        * @param oEvent the button press event.
        */
        onEquipmentConfirm: function (oEvent) {
            var oDialog = oEvent.getSource().getParent();
            var oView = this.base.getView();
            var oModel = oView.getModel();
            var sGroupId = this._getEquipmentUpdateGroupId();

            // Matnr is mandatory: validate all rows before submitting
            var oInfo = this._getEquipmentDialogInfo(this._sEquipmentType);
            var oMdcTable = oView.byId(oInfo.tableId);
            var oRowBinding = oMdcTable && oMdcTable.getRowBinding && oMdcTable.getRowBinding();
            var aContexts = oRowBinding
                ? (oRowBinding.getAllCurrentContexts ? oRowBinding.getAllCurrentContexts() : oRowBinding.getCurrentContexts())
                : [];
            var bMissingMatnr = aContexts.some(function (oCtx) {
                return !oCtx.getProperty("Matnr");
            });
            if (bMissingMatnr) {
                var oResourceBundle = oView.getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("RequiredFieldsMissing"));
                return;
            }

            oDialog.setBusy(true);
            oModel.submitBatch(sGroupId).then(function () {
                oDialog.setBusy(false);
                oDialog.close();
            }, function (oError) {
                oDialog.setBusy(false);
                MessageToast.show(oError && oError.message ? oError.message : "Save failed");
            });
        },

        /**
        * Closes the equipment assignment dialog and discards all changes
        * made in the dialog. The equipment rows use a dedicated update
        * group, so nothing was sent yet and resetChanges rolls back
        * creates, deletes and property changes completely.
        * @param oEvent the button press event.
        */
        onEquipmentClose: function (oEvent) {
            var oDialog = oEvent.getSource().getParent();
            var oModel = this.base.getView().getModel();
            oModel.resetChanges(this._getEquipmentUpdateGroupId());
            oDialog.close();
        },

        _getEquipmentDialogInfo: function (sType) {
            if (sType === "Loading") {
                return {
                    fragment: "com.cathaydining.zppe025.ext.fragment.LoadingEquipmentDialog",
                    tableId: "loadingEquipmentTable",
                    member: "_oLoadingEquipmentDialog"
                };
            }
            return {
                fragment: "com.cathaydining.zppe025.ext.fragment.ServingEquipmentDialog",
                tableId: "servingEquipmentTable",
                member: "_oServingEquipmentDialog"
            };
        },

        _openEquipmentAssignmentDialog: function (sType, sTitleKey) {
            var oView = this.base.getView();
            var oMitTable = oView.byId("com.cathaydining.zppe025::ZC_PP_LDGTEMP_HDRObjectPage--fe::table::_Mit::LineItem");
            this._aSelectedMitContexts = oMitTable && oMitTable.getSelectedContexts ? oMitTable.getSelectedContexts() : [];
            if (this._aSelectedMitContexts.length !== 1) {
                var oResourceBundle = oView.getModel("i18n").getResourceBundle();
                MessageToast.show(oResourceBundle.getText("SelectExactlyOneRow"));
                return;
            }
            this._sEquipmentType = sType;

            var oInfo = this._getEquipmentDialogInfo(sType);
            var oDialog = this[oInfo.member];
            if (!oDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: oInfo.fragment,
                    controller: this
                }).then(function (oLoadedDialog) {
                    this[oInfo.member] = oLoadedDialog;
                    oView.addDependent(oLoadedDialog);
                    this._setEquipmentDialogData(sType, sTitleKey);
                    oLoadedDialog.open();
                }.bind(this));
            } else {
                this._setEquipmentDialogData(sType, sTitleKey);
                oDialog.open();
            }
        },

        _setEquipmentDialogData: function (sType, sTitleKey) {
            var oView = this.base.getView();
            var oInfo = this._getEquipmentDialogInfo(sType);
            var oDialog = this[oInfo.member];
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();
            oDialog.setModel(new JSONModel({
                type: sType,
                title: oResourceBundle.getText(sTitleKey) || sTitleKey
            }), "equipmentModel");

            // Bind the MDC table to the selected Mit row; the delegate binds
            // the rows relatively via the navigation property (_LoadEq/_ServEq).
            var oMdcTable = oView.byId(oInfo.tableId);
            var oMitCtx = this._aSelectedMitContexts && this._aSelectedMitContexts[0];
            if (oMdcTable) {
                // Columns come from the UI.LineItem annotation of the entity
                // set configured in the delegate payload.
                EquipmentTableDelegate.createColumns(oMdcTable, this);
            }
            if (oMdcTable && oMitCtx) {
                oMdcTable.setBindingContext(oMitCtx);
                if (oMdcTable.rebind) {
                    oMdcTable.rebind();
                }
            }
        },

        onAcftTypeValueHelp: function (oEvent) {
            var oView = this.base.getView();
            var oODataModel = oView.getModel();
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();

            if (!this._oAcftTypeValueHelpDialog) {
                this._oAcftTypeValueHelpDialog = new TableSelectDialog({
                    title: oResourceBundle.getText("AcftType"),
                    contentWidth: "30rem",
                    contentHeight: "20rem",
                    columns: [
                        new Column({ header: new Text({ text: oResourceBundle.getText("AcftType") }) }),
                        new Column({ header: new Text({ text: oResourceBundle.getText("GalleyVersion") }) }),
                        new Column({ header: new Text({ text: oResourceBundle.getText("Description") }) })
                    ],
                    items: {
                        path: "/ZI_PP_ACTYPE_VH",
                        filters: this._getAcftTypeValueHelpFilters(""),
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{AcftType}" }),
                                new Text({ text: "{GalleyVersion}" }),
                                new Text({ text: "{Description}" })
                            ]
                        })
                    },
                    search: function (oSearchEvent) {
                        var sValue = oSearchEvent.getParameter("value") || "";
                        oSearchEvent.getSource().getBinding("items").filter(this._getAcftTypeValueHelpFilters(sValue));
                    }.bind(this),
                    confirm: function (oConfirmEvent) {
                        var oSelectedItem = oConfirmEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            var aCells = oSelectedItem.getCells();
                            var oModel = this._oPreviewDialog.getModel("previewModel");
                            oModel.setProperty("/AcftType", aCells[0].getText());
                            oModel.setProperty("/GalleyVersion", aCells[1].getText());
                        }
                    }.bind(this)
                });
                this._oAcftTypeValueHelpDialog.setModel(oODataModel);
                oView.addDependent(this._oAcftTypeValueHelpDialog);
            }

            var oAcftTypeBinding = this._oAcftTypeValueHelpDialog.getBinding("items");
            if (oAcftTypeBinding) {
                oAcftTypeBinding.filter(this._getAcftTypeValueHelpFilters(""));
            }
            this._oAcftTypeValueHelpDialog.open();
        },

        onGalleyVersionValueHelp: function (oEvent) {
            var oView = this.base.getView();
            var oODataModel = oView.getModel();
            var oResourceBundle = oView.getModel("i18n").getResourceBundle();

            if (!this._oGalleyVersionValueHelpDialog) {
                this._oGalleyVersionValueHelpDialog = new TableSelectDialog({
                    title: oResourceBundle.getText("GalleyVersion"),
                    contentWidth: "30rem",
                    contentHeight: "20rem",
                    columns: [
                        new Column({ header: new Text({ text: oResourceBundle.getText("GalleyVersion") }) }),
                        new Column({ header: new Text({ text: oResourceBundle.getText("Description") }) }),
                        new Column({ header: new Text({ text: oResourceBundle.getText("AcftType") }) })
                    ],
                    items: {
                        path: "/ZI_PP_GALVER_VH",
                        filters: this._getGalleyVersionValueHelpFilters(""),
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{GalleyVersion}" }),
                                new Text({ text: "{Description}" }),
                                new Text({ text: "{AcftType}" })
                            ]
                        })
                    },
                    search: function (oSearchEvent) {
                        var sValue = oSearchEvent.getParameter("value") || "";
                        oSearchEvent.getSource().getBinding("items").filter(this._getGalleyVersionValueHelpFilters(sValue));
                    }.bind(this),
                    confirm: function (oConfirmEvent) {
                        var oSelectedItem = oConfirmEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            this._oPreviewDialog.getModel("previewModel").setProperty("/GalleyVersion", oSelectedItem.getCells()[0].getText());
                        }
                    }.bind(this)
                });
                this._oGalleyVersionValueHelpDialog.setModel(oODataModel);
                oView.addDependent(this._oGalleyVersionValueHelpDialog);
            }

            var oGalleyVersionBinding = this._oGalleyVersionValueHelpDialog.getBinding("items");
            if (oGalleyVersionBinding) {
                oGalleyVersionBinding.filter(this._getGalleyVersionValueHelpFilters(""));
            }
            this._oGalleyVersionValueHelpDialog.open();
        },

        _getAcftTypeValueHelpFilters: function (sValue) {
            var aFilters = [];
            if (this._sPreviewAirlineCode) {
                aFilters.push(new Filter("AirlineCode", FilterOperator.EQ, this._sPreviewAirlineCode));
            }
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("AcftType", FilterOperator.Contains, sValue),
                        new Filter("GalleyVersion", FilterOperator.Contains, sValue),
                        new Filter("Description", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            return aFilters;
        },

        _getGalleyVersionValueHelpFilters: function (sValue) {
            var aFilters = [];
            if (this._sPreviewAirlineCode) {
                aFilters.push(new Filter("AirlineCode", FilterOperator.EQ, this._sPreviewAirlineCode));
            }
            var sAcftType = this._oPreviewDialog.getModel("previewModel").getProperty("/AcftType");
            if (sAcftType) {
                aFilters.push(new Filter("AcftType", FilterOperator.EQ, sAcftType));
            }
            if (sValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("GalleyVersion", FilterOperator.Contains, sValue),
                        new Filter("Description", FilterOperator.Contains, sValue),
                        new Filter("AcftType", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            }
            return aFilters;
        },

        /**
        * Opens the Recurring Setting dialog.
        * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
        */
        onRecurringSetting: function (oContext) {
            var oView = this.base.getView();
            // FE may pass context, or an event, or nothing depending on version
            if (oContext && typeof oContext.getSource === "function") {
                oContext = oContext.getSource().getBindingContext() || oView.getBindingContext();
            } else if (!oContext || typeof oContext.requestProperty !== "function") {
                oContext = oView.getBindingContext();
            }
            this._oRecurringContext = oContext;

            var fnOpen = function () {
                return this._prefillRecurringFromContext(this._oRecurringContext).then(function () {
                    this._oRecurringDialog.open();
                }.bind(this));
            }.bind(this);

            if (!this._oRecurringDialog) {
                Fragment.load({
                    id: oView.getId() + "--recurring",
                    name: "com.cathaydining.zppe025.ext.fragment.RecurringSettingDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oRecurringDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(new JSONModel(this._getDefaultRecurringData()), "recurringModel");
                    return fnOpen();
                }.bind(this));
            } else {
                this._oRecurringDialog.getModel("recurringModel").setData(this._getDefaultRecurringData());
                fnOpen();
            }
        },

        _isRecurringFlagOn: function (vValue) {
            return vValue === true || vValue === "true" || vValue === "X" || vValue === "x" || vValue === 1 || vValue === "1";
        },

        _buildWeekDayPattern: function (oFlags) {
            var aDigits = [];
            if (oFlags.Monday) { aDigits.push("1"); }
            if (oFlags.Tuesday) { aDigits.push("2"); }
            if (oFlags.Wednesday) { aDigits.push("3"); }
            if (oFlags.Thursday) { aDigits.push("4"); }
            if (oFlags.Friday) { aDigits.push("5"); }
            if (oFlags.Saturday) { aDigits.push("6"); }
            if (oFlags.Sunday) { aDigits.push("7"); }
            return aDigits.join("");
        },

        _readRecurringHeaderFields: function (oContext) {
            var aProps = [
                "SeriesType", "RecurInterval",
                "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
                "MonthRank", "MonthWeekday"
            ];
            var oCached = (oContext.getObject && oContext.getObject()) || {};
            var oView = this.base.getView();
            var oODataModel = oView.getModel();

            // Recurring fields are not on the Object Page UI, so OP $select omits them.
            // Bind a dedicated context with explicit $select to force a server read.
            var fnFromProps = function (oSource) {
                var oData = {};
                aProps.forEach(function (sProp) {
                    oData[sProp] = oSource && oSource[sProp] !== undefined ? oSource[sProp] : oCached[sProp];
                });
                return oData;
            };

            if (oODataModel && oContext.getPath && oContext.getPath()) {
                try {
                    var oBinding = oODataModel.bindContext(oContext.getPath(), undefined, {
                        $select: aProps.join(",")
                    });
                    return oBinding.requestObject().then(function (oData) {
                        oBinding.destroy();
                        return fnFromProps(oData);
                    }).catch(function () {
                        oBinding.destroy();
                        if (typeof oContext.requestObject === "function") {
                            return oContext.requestObject().then(fnFromProps);
                        }
                        return fnFromProps(oCached);
                    });
                } catch (e) {
                    // fall through
                }
            }

            if (typeof oContext.requestObject === "function") {
                return oContext.requestObject().then(fnFromProps).catch(function () {
                    return fnFromProps(oCached);
                });
            }

            return Promise.resolve(fnFromProps(oCached));
        },

        _prefillRecurringFromContext: function (oContext) {
            if (!this._oRecurringDialog) {
                return Promise.resolve();
            }
            if (!oContext) {
                return Promise.resolve();
            }

            return this._readRecurringHeaderFields(oContext).then(function (oData) {
                oData = oData || {};
                var oModel = this._oRecurringDialog.getModel("recurringModel");
                var sSeriesType = String(oData.SeriesType || "").trim().toUpperCase();
                var bMon = this._isRecurringFlagOn(oData.Mon);
                var bTue = this._isRecurringFlagOn(oData.Tue);
                var bWed = this._isRecurringFlagOn(oData.Wed);
                var bThu = this._isRecurringFlagOn(oData.Thu);
                var bFri = this._isRecurringFlagOn(oData.Fri);
                var bSat = this._isRecurringFlagOn(oData.Sat);
                var bSun = this._isRecurringFlagOn(oData.Sun);
                var sMonthRank = oData.MonthRank != null && String(oData.MonthRank).trim() !== ""
                    ? String(oData.MonthRank).trim()
                    : "";
                var sMonthWeekday = oData.MonthWeekday != null && String(oData.MonthWeekday).trim() !== ""
                    ? String(oData.MonthWeekday).trim()
                    : "";

                // Prefer SeriesType; if blank, infer from monthly fields
                var bMonthly = sSeriesType === "M"
                    || (sSeriesType !== "W" && (!!sMonthRank || !!sMonthWeekday));
                var bWeekly = !bMonthly;

                var oFlags = {
                    Monday: bMon,
                    Tuesday: bTue,
                    Wednesday: bWed,
                    Thursday: bThu,
                    Friday: bFri,
                    Saturday: bSat,
                    Sunday: bSun
                };

                oModel.setData({
                    isWeekly: bWeekly,
                    isMonthly: bMonthly,
                    RecurEvery: oData.RecurInterval != null && String(oData.RecurInterval).trim() !== ""
                        ? String(oData.RecurInterval).trim()
                        : "1",
                    WeekDayPattern: this._buildWeekDayPattern(oFlags),
                    Monday: bMon,
                    Tuesday: bTue,
                    Wednesday: bWed,
                    Thursday: bThu,
                    Friday: bFri,
                    Saturday: bSat,
                    Sunday: bSun,
                    Ordinal: sMonthRank || "1",
                    WeekDay: sMonthWeekday || "1"
                });
                oModel.updateBindings(true);
            }.bind(this));
        },

        _getDefaultRecurringData: function () {
            return {
                isWeekly: true,
                isMonthly: false,
                RecurEvery: "1",
                WeekDayPattern: "",
                Monday: false,
                Tuesday: false,
                Wednesday: false,
                Thursday: false,
                Friday: false,
                Saturday: false,
                Sunday: false,
                Ordinal: "1",
                WeekDay: "1"
            };
        },

        onRecurringTypeChange: function (oEvent) {
            var oModel = this._oRecurringDialog.getModel("recurringModel");
            var sId = oEvent.getSource().getId();
            var bWeekly = sId.indexOf("rbWeekly") !== -1;
            oModel.setProperty("/isWeekly", bWeekly);
            oModel.setProperty("/isMonthly", !bWeekly);
        },

        onWeekDayPatternChange: function (oEvent) {
            var sValue = oEvent.getParameter("value") || "";
            var oModel = this._oRecurringDialog.getModel("recurringModel");
            var mDayByDigit = {
                "1": "Monday",
                "2": "Tuesday",
                "3": "Wednesday",
                "4": "Thursday",
                "5": "Friday",
                "6": "Saturday",
                "7": "Sunday"
            };

            // Keep only digits 1-7, drop duplicates and invalid chars, preserve order
            var aSeen = [];
            var sSanitized = "";
            for (var i = 0; i < sValue.length; i++) {
                var sChar = sValue.charAt(i);
                if (mDayByDigit[sChar] && aSeen.indexOf(sChar) === -1) {
                    aSeen.push(sChar);
                    sSanitized += sChar;
                }
            }

            oModel.setProperty("/WeekDayPattern", sSanitized);

            Object.keys(mDayByDigit).forEach(function (sDigit) {
                oModel.setProperty("/" + mDayByDigit[sDigit], aSeen.indexOf(sDigit) !== -1);
            });
        },

        onRecurringClear: function () {
            this._oRecurringDialog.getModel("recurringModel").setData(this._getDefaultRecurringData());
        },

        onRecurringClose: function () {
            if (this._oRecurringDialog) {
                this._oRecurringDialog.close();
            }
        },

        onRecurringConfirm: function () {
            var oData = this._oRecurringDialog.getModel("recurringModel").getData();
            var oContext = this._oRecurringContext;
            var oResourceBundle = this.base.getView().getModel("i18n").getResourceBundle();

            if (!oContext) {
                MessageToast.show(oResourceBundle.getText("RecurringSettingFailed"));
                return;
            }

            var oODataModel = this.base.getView().getModel();
            var oAction = oODataModel.bindContext("com.sap.gateway.srvd.zsd_pp_ldgtemp_hdr.v0001.RecurringSetting(...)", oContext);
            oAction.setParameter("RecurInterval", String(oData.RecurEvery || ""));
            if (oData.isWeekly === true) {
                oAction.setParameter("SeriesType", "W");
                oAction.setParameter("Mon", oData.Monday);
                oAction.setParameter("Tue", oData.Tuesday);
                oAction.setParameter("Wed", oData.Wednesday);
                oAction.setParameter("Thu", oData.Thursday);
                oAction.setParameter("Fri", oData.Friday);
                oAction.setParameter("Sat", oData.Saturday);
                oAction.setParameter("Sun", oData.Sunday);
                oAction.setParameter("MonthRank", "");
                oAction.setParameter("MonthWeekday", "");
            } else {
                // MonthWeekday is NUMC1: 1=Mon … 7=Sun (must match Select keys)
                var sWeekDay = String(oData.WeekDay || "1");
                oAction.setParameter("SeriesType", "M");
                oAction.setParameter("Mon", sWeekDay === "1");
                oAction.setParameter("Tue", sWeekDay === "2");
                oAction.setParameter("Wed", sWeekDay === "3");
                oAction.setParameter("Thu", sWeekDay === "4");
                oAction.setParameter("Fri", sWeekDay === "5");
                oAction.setParameter("Sat", sWeekDay === "6");
                oAction.setParameter("Sun", sWeekDay === "7");
                oAction.setParameter("MonthRank", oData.Ordinal);
                oAction.setParameter("MonthWeekday", sWeekDay);
            }
            this._oRecurringDialog.setBusy(true);
            oAction.execute().then(function () {
                var aRecurringPaths = [
                    "SeriesType", "RecurInterval",
                    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
                    "MonthRank", "MonthWeekday"
                ];
                var oRefreshPromise = Promise.resolve();
                if (oContext && typeof oContext.requestSideEffects === "function") {
                    oRefreshPromise = oContext.requestSideEffects(aRecurringPaths);
                } else if (oContext && typeof oContext.requestRefresh === "function") {
                    oRefreshPromise = oContext.requestRefresh();
                } else if (oContext && typeof oContext.refresh === "function") {
                    oContext.refresh();
                }
                return oRefreshPromise;
            }.bind(this)).then(function () {
                this._oRecurringDialog.setBusy(false);
                MessageToast.show(oResourceBundle.getText("RecurringSettingSaved"));
                this._oRecurringDialog.close();
            }.bind(this)).catch(function (oError) {
                this._oRecurringDialog.setBusy(false);
                MessageToast.show(oError && oError.message ? oError.message : oResourceBundle.getText("RecurringSettingFailed"));
            }.bind(this));
        },


        onOpenAttachment: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext();
            if (!oCtx) {
                return;
            }

            var sItemId = oCtx.getProperty("ItemId");
            var bIsActive = oCtx.getProperty("IsActiveEntity");

            if (!sItemId) {
                return;
            }

            // ItemId stays identical for the draft and the active instance,
            // so attachments uploaded in the draft remain found after activation.
            var sObjectKey = sItemId;

            // 'C' allows upload/delete while the draft is being edited,
            // 'D' shows the attachments read-only on the active instance.
            var sMode = bIsActive ? "D" : "C";
            var oResourceBundle = this.base.getView().getModel("i18n").getResourceBundle();

            // Destroy previous dialog if exists
            if (this._oAttDialog) {
                this._oAttDialog.destroy();
                this._oAttDialog = null;
            }

            // Load the lazy library first, then create component
            var that = this;
            BusyIndicator.show(0);
            Lib.load({ name: "sap.se.mi.plm.lib.attachmentservice" }).then(function () {
                BusyIndicator.hide();
                var oComponentContainer = new ComponentContainer({
                    name: "sap.se.mi.plm.lib.attachmentservice.attachment.components.fscomponent",
                    settings: {
                        mode: sMode,
                        objectType: "LDGTEMP_DI",
                        objectKey: sObjectKey,
                        isGuid: true,
                        isDraft: !bIsActive
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
            var aVisibleActions = ["RENAME", "DELETE", "ADD", "ADDURL", "DOWNLOAD"];

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

            // The component resets its attributes once its own OData requests
            // finish, so the configuration has to be applied again afterwards.
            try {
                var oInnerModel = oAttComp.getRootControl().getController().oModel;
                if (oInnerModel && oInnerModel.attachBatchRequestCompleted) {
                    oInnerModel.attachBatchRequestCompleted(fnApply);
                }
            } catch (oError) {
                // Internal structure of the reuse component changed: the
                // attributes stay at the values applied above.
                MessageToast.show(oError.message);
            }
        }


    });
});
