sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/AnalyticalColumn",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/export/Spreadsheet"
], function (Controller, Column, Text, Label, Spreadsheet) {
    "use strict";

    // ─── Constants ────────────────────────────────────────────────────────────
    // OData property names of the three "Totals" columns shown in the table header
    var TOTALS_LABELS = ["Total", "Sec1", "Sec2"];
    // OData property names used when searching for the insertion point for dynamic columns
    var TOTALS_PROPERTIES = ["Total", "Sector1", "Sector2"];

    return {

        // ─── Lifecycle ────────────────────────────────────────────────────────

        /**
         * Called after the view is rendered.
         * Applies the "Totals" multi-level column header once the SmartTable is ready.
         * A flag (_bInitApplied) prevents repeated execution on subsequent renders.
         */
        onAfterRendering: function () {
            if (this._bInitApplied) { return; }
            var oSmartTable = this._getSmartTable();
            if (!oSmartTable) { return; }
            var that = this;
            var fnApply = function () {
                var oTable = oSmartTable.getTable();
                if (!oTable) { return; }
                that._applyTotalsMultiLabel(oTable);
                that._bInitApplied = true;
            };
            // SmartTable may already be initialised (e.g. on hot-reload)
            if (oSmartTable.isInitialised()) {
                fnApply();
            } else {
                oSmartTable.attachEventOnce("initialise", fnApply);
            }
        },

        // ─── i18n Helpers ─────────────────────────────────────────────────────

        /** Lazily retrieves the i18n resource bundle from the view model. */
        _getResourceBundle: function () {
            if (!this._oResourceBundle) {
                var oI18nModel = this.getView() && this.getView().getModel("i18n");
                this._oResourceBundle = oI18nModel ? oI18nModel.getResourceBundle() : null;
            }
            return this._oResourceBundle;
        },

        /** Returns the translated text for sKey, or the key itself as fallback. */
        _getI18nText: function (sKey, aArgs) {
            var oBundle = this._getResourceBundle();
            return oBundle ? oBundle.getText(sKey, aArgs) : sKey;
        },

        // ─── Export ───────────────────────────────────────────────────────────

        /**
         * Fiori Elements extension hook called before the spreadsheet export starts.
         * The workbook columns may not be available yet at this point;
         * actual processing is done in the beforeExport event handler registered
         * during onBeforeRebindTableExtension.
         */
        onBeforeExportTableExtension: function () {},  // processing handled by beforeExport listener

        /**
         * Enriches the export workbook with dynamic meal-type columns and
         * inserts airline-level subtotal rows and an overall grand-total row.
         *
         * Data flow:
         *  1. Read dynamic columns from the table (flagged with "dynamicMealTypeGrp").
         *  2. Expand the NoOfMeal JSON field into flat MEAL_<GRP> properties per row.
         *  3. Accumulate Total / Sector1 / Sector2 per airline group.
         *  4. Append subtotal rows (skipped when the group has only one data row).
         *  5. Append a grand-total row.
         *  6. Inject dynamic columns into the workbook column list before "Total".
         */
        _addDynamicColumnsToExport: function (oExportSettings) {
            if (!oExportSettings || !oExportSettings.workbook || !oExportSettings.workbook.columns) { return; }
            // Guard: run only once per export invocation
            if (oExportSettings.__dynamicColumnsHandled) { return; }
            oExportSettings.__dynamicColumnsHandled = true;

            var oSmartTable = this._getSmartTable();
            if (!oSmartTable) { return; }
            var oTable = oSmartTable.getTable();
            if (!oTable) { return; }
            var oBinding = oTable.getBinding("rows");
            if (!oBinding) { return; }

            // 1. Collect dynamic meal-type columns (inserted at runtime, not from SmartTable metadata)
            var aDynamicColumns = oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicMealTypeGrp");
            });
            if (!aDynamicColumns.length) { return; }

            // Build column descriptor list: { class: "BF", property: "MEAL_BF" }
            var aDynamicColumnInfos = aDynamicColumns.map(function (oCol) {
                var sClass = "";
                var aML = oCol.getMultiLabels && oCol.getMultiLabels();
                if (aML && aML[1] && aML[1].getText) { sClass = aML[1].getText(); }
                return { class: sClass, property: "MEAL_" + sClass };
            }).filter(function (oInfo) { return oInfo.class; });

            if (!aDynamicColumnInfos.length) { return; }

            // 2. Build flat export rows from OData contexts
            var aContexts = oBinding.getContexts(0, oBinding.getLength());
            var iTotalTotal = 0, iTotalSector1 = 0, iTotalSector2 = 0;
            var mAirlineTotals = {}; // keyed by Airline code

            var aExportData = aContexts.filter(function (oCtx) {
                // Skip summary/empty rows that have no flight number
                return (oCtx.getObject() || {}).FlightNum;
            }).map(function (oCtx) {
                var oObj = oCtx.getObject() || {};
                var oExport = Object.assign({}, oObj);

                // Expand NoOfMeal JSON array into individual MEAL_<GRP> properties
                if (oObj.NoOfMeal) {
                    try {
                        JSON.parse(oObj.NoOfMeal).forEach(function (oItem) {
                            if (oItem && oItem.ZMEAL_TYPE_GRP) {
                                oExport["MEAL_" + oItem.ZMEAL_TYPE_GRP] =
                                    oItem.QUANTITY == null ? "" : String(oItem.QUANTITY);
                            }
                        });
                    } catch (e) { /* malformed JSON – skip silently */ }
                }

                // Initialise per-airline accumulator on first encounter
                var sCode = oObj.Airline || "";
                if (!mAirlineTotals[sCode]) {
                    mAirlineTotals[sCode] = { Total: 0, Sector1: 0, Sector2: 0, rowCount: 0 };
                }
                mAirlineTotals[sCode].rowCount += 1;

                // Accumulate numeric summary fields
                if (oObj.Total != null && !isNaN(oObj.Total)) {
                    var iT = Number(oObj.Total);
                    iTotalTotal += iT;
                    mAirlineTotals[sCode].Total += iT;
                }
                if (oObj.Sector1 != null && !isNaN(oObj.Sector1)) {
                    var iS1 = Number(oObj.Sector1);
                    iTotalSector1 += iS1;
                    mAirlineTotals[sCode].Sector1 += iS1;
                }
                if (oObj.Sector2 != null && !isNaN(oObj.Sector2)) {
                    var iS2 = Number(oObj.Sector2);
                    iTotalSector2 += iS2;
                    mAirlineTotals[sCode].Sector2 += iS2;
                }

                return oExport;
            });

            // 3. Append airline subtotal rows (skip single-row groups)
            Object.keys(mAirlineTotals).sort().forEach(function (sCode) {
                var oAT = mAirlineTotals[sCode];
                if (oAT.rowCount <= 1) { return; }
                aExportData.push({
                    Airline:   sCode,
                    FlightNum: sCode + " " + this._getI18nText("airlineTotalText"),
                    Total:     String(oAT.Total),
                    Sector1:   String(oAT.Sector1),
                    Sector2:   String(oAT.Sector2)
                });
            }.bind(this));

            // 4. Append grand-total row (dynamic meal columns intentionally left blank)
            aExportData.push({
                FlightNum: this._getI18nText("summaryTotalText"),
                Total:     String(iTotalTotal),
                Sector1:   String(iTotalSector1),
                Sector2:   String(iTotalSector2)
            });

            oExportSettings.dataSource = { type: "array", data: aExportData };

            // 5. Remove workbook columns whose property is null/empty to prevent framework errors
            //    (multi-label columns added via JS may not carry a valid property reference)
            oExportSettings.workbook.columns = oExportSettings.workbook.columns.filter(function (oCol) {
                return oCol && oCol.property != null && oCol.property !== "";
            });

            // 6. Inject dynamic meal columns before the first "Total/Sector" column
            var aColumns = oExportSettings.workbook.columns;
            var iInsertIndex = -1;
            for (var j = 0; j < aColumns.length; j++) {
                if (TOTALS_PROPERTIES.indexOf(aColumns[j].label) !== -1 ||
                    TOTALS_PROPERTIES.indexOf(aColumns[j].property) !== -1) {
                    iInsertIndex = j;
                    break;
                }
            }
            aDynamicColumnInfos.forEach(function (oInfo, iIdx) {
                var oColDef = { label: oInfo.class, property: oInfo.property, type: "String", width: 10 };
                if (iInsertIndex !== -1) {
                    aColumns.splice(iInsertIndex + iIdx, 0, oColDef);
                } else {
                    aColumns.push(oColDef);
                }
            });
        },

        // ─── Table Helpers ────────────────────────────────────────────────────

        /** Finds and returns the first SmartTable in the view, or null. */
        _getSmartTable: function () {
            var aFound = [];
            this.getView().findAggregatedObjects(true, function (oCtrl) {
                if (oCtrl.isA && oCtrl.isA("sap.ui.comp.smarttable.SmartTable")) { aFound.push(oCtrl); }
            });
            return aFound[0] || null;
        },

        // ─── Table Extension Hooks ────────────────────────────────────────────

        /**
         * Called by Fiori Elements before every table rebind (search / filter change).
         * Responsibilities:
         *  - Remove stale dynamic columns from the previous query.
         *  - Re-apply the "Totals" multi-label header.
         *  - Register listeners to rebuild dynamic columns once new data arrives.
         *  - Register a fallback export listener in case onBeforeExportTableExtension is not fired.
         */
        onBeforeRebindTableExtension: function (oEvent) {
            var oSmartTable = oEvent.getSource();
            if (!oSmartTable) { return; }
            var oTable = oSmartTable.getTable();
            if (!oTable) { return; }

            // Remove dynamic columns from the previous query immediately
            this._removeDynamicColumns(oSmartTable);

            // Re-apply the Totals multi-level header (visible before data arrives)
            this._applyTotalsMultiLabel(oTable);

            // Detach any listeners that may have survived from the previous cycle
            this._detachDataListeners(oTable, oSmartTable);
            this._detachExportListener(oSmartTable);

            // One-shot guard so only the first of (dataReceived / _rowsUpdated) triggers the rebuild
            var bDone = false;
            var that = this;
            var fnRebuild = function () {
                if (bDone) { return; }
                bDone = true;
                that._addDynamicColumns(oSmartTable);
                that._detachDataListeners(oTable, oSmartTable);
            };

            // Primary trigger: SmartTable dataReceived event
            var fnDataReceived = function () { fnRebuild(); };
            this._fnSmartTableDataReceivedHandler = fnDataReceived;
            oSmartTable.attachEventOnce("dataReceived", fnDataReceived);

            // Fallback trigger: internal _rowsUpdated, fires when rows are populated
            var fnRowsUpdated = function () {
                var oB = oTable.getBinding("rows");
                if (!oB) { return; }
                var bHasData = oB.getContexts(0, oB.getLength()).some(function (oCtx) {
                    var oObj = oCtx.getObject();
                    return oObj && oObj.NoOfMeal;
                });
                if (bHasData) { fnRebuild(); }
            };
            this._fnDynamicColumnHandler = fnRowsUpdated;
            oTable.attachEvent("_rowsUpdated", fnRowsUpdated);

            // Register beforeExport listener to process dynamic columns when export is triggered
            var fnBeforeExport = function (oEvt) {
                this._addDynamicColumnsToExport(oEvt.getParameter("exportSettings"));
            }.bind(this);
            this._fnBeforeExportHandler = fnBeforeExport;
            oSmartTable.attachEvent("beforeExport", fnBeforeExport);
        },

        /** Detaches data-loading listeners (dataReceived / _rowsUpdated) registered during a rebind cycle.
         *  The beforeExport listener is intentionally NOT detached here – it must remain active
         *  until the user actually triggers an export. */
        _detachDataListeners: function (oTable, oSmartTable) {
            if (this._fnDynamicColumnHandler) {
                oTable.detachEvent("_rowsUpdated", this._fnDynamicColumnHandler);
                this._fnDynamicColumnHandler = null;
            }
            if (this._fnSmartTableDataReceivedHandler) {
                oSmartTable.detachEvent("dataReceived", this._fnSmartTableDataReceivedHandler);
                this._fnSmartTableDataReceivedHandler = null;
            }
        },

        /** Detaches the beforeExport listener. Called at the start of every rebind
         *  so the old listener is replaced by a fresh one. */
        _detachExportListener: function (oSmartTable) {
            if (this._fnBeforeExportHandler) {
                oSmartTable.detachEvent("beforeExport", this._fnBeforeExportHandler);
                this._fnBeforeExportHandler = null;
            }
        },

        // ─── Dynamic Column Management ────────────────────────────────────────

        /**
         * Removes all runtime-added meal-type columns and resets the
         * Totals multi-label back to plain single-level headers.
         */
        _removeDynamicColumns: function (oSmartTable) {
            var oTable = oSmartTable.getTable();
            if (!oTable) { return; }

            // Destroy columns flagged as dynamically inserted
            oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicMealTypeGrp");
            }).forEach(function (oCol) {
                oTable.removeColumn(oCol);
                oCol.destroy();
            });

            // Reset any multi-label headers back to plain single-level labels
            this._resetTotalsMultiLabel(oTable);
        },

        /**
         * Restores the Total / Sec1 / Sec2 columns to their original single-level headers.
         * The sub-label text is preserved so that getLeadingProperty() continues to work
         * correctly when _addDynamicColumns searches for the insertion index.
         */
        _resetTotalsMultiLabel: function (oTable) {
            oTable.getColumns().filter(function (oCol) {
                return oCol.data("totalsMultiHeader");
            }).forEach(function (oCol) {
                // Read the sub-label (row[1]) before destroying so we can restore it
                var sSubLabel = "";
                var aML = oCol.getMultiLabels && oCol.getMultiLabels();
                if (aML && aML[1] && aML[1].getText) { sSubLabel = aML[1].getText(); }

                if (oCol.destroyMultiLabels) { oCol.destroyMultiLabels(); }
                if (sSubLabel && oCol.setLabel) {
                    oCol.setLabel(new sap.m.Label({ text: sSubLabel }));
                }
                oCol.setHeaderSpan(1);
                oCol.data("totalsMultiHeader", false);
            });
        },

        /**
         * Builds and inserts one AnalyticalColumn per distinct ZMEAL_TYPE_GRP value
         * found in the NoOfMeal JSON field.  Columns are inserted immediately before
         * the first "Total / Sector1 / Sector2" column, or appended if not found.
         * After inserting, the Totals multi-label is re-applied.
         */
        _addDynamicColumns: function (oSmartTable) {
            var oTable = oSmartTable.getTable();
            var oBinding = oTable.getBinding("rows");
            if (!oBinding) { return; }

            // Remove any leftover dynamic columns before rebuilding
            oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicMealTypeGrp");
            }).forEach(function (oCol) {
                oTable.removeColumn(oCol);
                oCol.destroy();
            });

            // Collect distinct ZMEAL_TYPE_GRP values across all loaded rows
            var aMealGroups = [];
            oBinding.getContexts(0, oBinding.getLength()).forEach(function (oCtx) {
                var oObj = oCtx.getObject();
                if (!oObj || !oObj.NoOfMeal) { return; }
                try {
                    JSON.parse(oObj.NoOfMeal).forEach(function (oItem) {
                        var sGrp = oItem && oItem.ZMEAL_TYPE_GRP;
                        if (sGrp && aMealGroups.indexOf(sGrp) === -1) { aMealGroups.push(sGrp); }
                    });
                } catch (e) { /* ignore */ }
            });
            if (!aMealGroups.length) { return; }

            // Find the index of the first "Total/Sector" column to use as insertion point
            var aTableCols = oTable.getColumns();
            var iInsertIndex = -1;
            for (var i = 0; i < aTableCols.length; i++) {
                var sLeading = aTableCols[i].getLeadingProperty && aTableCols[i].getLeadingProperty();
                if (TOTALS_PROPERTIES.indexOf(sLeading) !== -1) {
                    iInsertIndex = i;
                    break;
                }
            }

            var iCount = aMealGroups.length;
            var sGroupLabel = this._getI18nText("NoOfMealuration");

            // Create one column per meal group
            aMealGroups.forEach(function (sGrp, iIdx) {
                var oCol = new Column({
                    leadingProperty: "",
                    grouped: false,
                    summed: false,
                    hAlign: "End",
                    // Two-level header: group label on top, meal-type code below
                    multiLabels: [
                        new Label({ text: sGroupLabel, textAlign: "Center", design: "Bold" }),
                        new Label({ text: sGrp, textAlign: "Right" })
                    ],
                    // First column spans all siblings; subsequent columns span 1
                    headerSpan: [iCount - iIdx, 1],
                    template: new Text({
                        text: {
                            path: "NoOfMeal",
                            formatter: function (sNoOfMeal) {
                                if (!sNoOfMeal) { return ""; }
                                try {
                                    var aItems = JSON.parse(sNoOfMeal);
                                    for (var k = 0; k < aItems.length; k++) {
                                        if (aItems[k].ZMEAL_TYPE_GRP === sGrp) {
                                            var v = aItems[k].QUANTITY;
                                            return v == null ? "" : String(v);
                                        }
                                    }
                                } catch (e) { /* ignore */ }
                                return "";
                            }
                        }
                    }),
                    width: "8rem"
                });

                oCol.getTemplate().addStyleClass("cabinDynamicColumn");
                oCol.data("dynamicMealTypeGrp", true);

                if (iInsertIndex !== -1) {
                    oTable.insertColumn(oCol, iInsertIndex + iIdx);
                } else {
                    oTable.addColumn(oCol);
                }
            });

            oTable.setEnableColumnFreeze(false);

            // Re-apply the Totals multi-label after columns have been inserted
            this._applyTotalsMultiLabel(oTable);
        },

        // ─── Column Header Customisation ──────────────────────────────────────

        /**
         * Applies a two-level multi-label header to the Total / Sec1 / Sec2 columns.
         * Row 0 (top):    "Totals"  – spans all three columns
         * Row 1 (bottom): original label text  – individual column label
         *
         * Uses the multiLabels aggregation of sap.ui.table.Column.
         * Columns are marked with the "totalsMultiHeader" custom data flag.
         */
        _applyTotalsMultiLabel: function (oTable) {
            // Find columns whose current label matches one of the Totals labels
            var aTotalsEntries = [];
            oTable.getColumns().forEach(function (oCol) {
                var oLbl = oCol.getLabel && oCol.getLabel();
                var sText = oLbl && oLbl.getText ? oLbl.getText() : "";
                if (TOTALS_LABELS.indexOf(sText) !== -1) {
                    aTotalsEntries.push({ col: oCol, label: sText });
                }
            });
            if (!aTotalsEntries.length) { return; }

            var iSpan = aTotalsEntries.length;
            aTotalsEntries.forEach(function (oEntry, iIdx) {
                var oCol = oEntry.col;
                if (!oCol.addMultiLabel) { return; }
                oCol.destroyMultiLabels();
                // Top label: "Totals", spanning all columns in the group
                oCol.addMultiLabel(new Label({ text: "Totals", textAlign: "Center", design: "Bold" }));
                // Bottom label: original column label
                oCol.addMultiLabel(new Label({ text: oEntry.label }));
                oCol.setHeaderSpan([iSpan - iIdx, 1]);
                oCol.data("totalsMultiHeader", true);
            });
        }

    };

});
