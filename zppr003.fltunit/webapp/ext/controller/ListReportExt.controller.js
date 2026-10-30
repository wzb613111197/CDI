sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/table/AnalyticalColumn",
    "sap/m/Text",
    "sap/m/Label",
    "sap/ui/export/Spreadsheet"
], function (Controller, Column, Text, Label, Spreadsheet) {
    "use strict";

    // ─── Constants ────────────────────────────────────────────────────────────
    // Leading properties used to locate the insertion point for dynamic cabin columns
    var TTL_PROPERTIES = ["TTL", "Ratio", "NumOfFlight", "FlightUnit"];

    return {

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
         * Registers a one-shot beforeExport listener so we can access the fully-built
         * workbook columns in that event.
         */
        onBeforeExportTableExtension: function () {
            var oSmartTable = this._getSmartTable();
            if (!oSmartTable) { return; }
            var that = this;
            // attachEventOnce ensures we don't double-handle if the rebind listener also fires
            oSmartTable.attachEventOnce("beforeExport", function (oEvt) {
                that._addDynamicColumnsToExport(oEvt.getParameter("exportSettings"));
            });
        },

        /**
         * Enriches the export workbook with dynamic cabin-class columns and
         * inserts airline-level subtotal rows and an overall grand-total row.
         *
         * Data flow:
         *  1. Read dynamic columns from the table (flagged with "dynamicCabin").
         *  2. Expand the SeatConfig JSON field into flat CABIN_<CLASS> properties per row.
         *  3. Accumulate NumOfFlight / FlightUnit / cabin quantities per airline group.
         *  4. Append subtotal rows for every airline group.
         *  5. Append an overall grand-total row (includes per-cabin totals).
         *  6. Inject dynamic columns into the workbook column list before "TTL".
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

            // 1. Collect dynamic cabin columns (inserted at runtime, not from SmartTable metadata)
            var aDynamicColumns = oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicCabin");
            });
            if (!aDynamicColumns.length) { return; }

            // Build column descriptor list: { class: "J", property: "CABIN_J" }
            var aDynamicColumnInfos = aDynamicColumns.map(function (oCol) {
                var sClass = "";
                var aML = oCol.getMultiLabels && oCol.getMultiLabels();
                if (aML && aML[1] && aML[1].getText) { sClass = aML[1].getText(); }
                return { class: sClass, property: "CABIN_" + sClass };
            }).filter(function (oInfo) { return oInfo.class; });

            if (!aDynamicColumnInfos.length) { return; }

            // 2. Build flat export rows from OData contexts
            var aContexts = oBinding.getContexts(0, oBinding.getLength());

            // Helper: expand SeatConfig JSON into flat cabin properties on an export row
            var fnExpandSeatConfig = function (oObj, oExport) {
                if (!oObj.SeatConfig) { return; }
                try {
                    JSON.parse(oObj.SeatConfig).forEach(function (oItem) {
                        if (oItem && oItem.CABIN_CLASS) {
                            oExport["CABIN_" + oItem.CABIN_CLASS] =
                                oItem.QUANTITY == null ? "" : String(oItem.QUANTITY);
                        }
                    });
                } catch (e) { /* malformed JSON – skip silently */ }
            };

            // Helper: accumulate SeatConfig quantities into a totals map { cabinClass: number }
            var fnAccumulateCabins = function (oObj, oCabinTotals) {
                if (!oObj.SeatConfig) { return; }
                try {
                    JSON.parse(oObj.SeatConfig).forEach(function (oItem) {
                        if (oItem && oItem.CABIN_CLASS && oItem.QUANTITY != null && !isNaN(oItem.QUANTITY)) {
                            oCabinTotals[oItem.CABIN_CLASS] =
                                (oCabinTotals[oItem.CABIN_CLASS] || 0) + Number(oItem.QUANTITY);
                        }
                    });
                } catch (e) { /* ignore */ }
            };

            // Helper: create a subtotal row from accumulated totals
            var fnMakeSubRow = function (oProps, oTotals) {
                var oRow = Object.assign({}, oProps);
                oRow.NumOfFlight = String(oTotals.NumOfFlight);
                oRow.FlightUnit  = String(oTotals.FlightUnit);
                aDynamicColumnInfos.forEach(function (oInfo) {
                    oRow[oInfo.property] = String(oTotals.cabinTotals[oInfo.class] || 0);
                });
                return oRow;
            };

            // Helper: empty totals accumulator
            var fnNewTotals = function () {
                return { NumOfFlight: 0, FlightUnit: 0, cabinTotals: {} };
            };

            // Helper: add one data row's numbers into a totals accumulator
            var fnAddToTotals = function (oObj, oTotals) {
                if (oObj.NumOfFlight != null && !isNaN(oObj.NumOfFlight)) {
                    oTotals.NumOfFlight += Number(oObj.NumOfFlight);
                }
                if (oObj.FlightUnit != null && !isNaN(oObj.FlightUnit)) {
                    oTotals.FlightUnit += Number(oObj.FlightUnit);
                }
                fnAccumulateCabins(oObj, oTotals.cabinTotals);
            };

            // Collect raw data rows (skip OData summary rows that have no FlightNum)
            var aRawRows = aContexts.filter(function (oCtx) {
                return (oCtx.getObject() || {}).FlightNum;
            }).map(function (oCtx) {
                var oObj = oCtx.getObject() || {};
                var oExport = Object.assign({}, oObj);
                fnExpandSeatConfig(oObj, oExport);
                return oExport;
            });

            // Sort: primary by Airline, secondary by AircraftType
            aRawRows.sort(function (a, b) {
                var cmp = (a.Airline || "").localeCompare(b.Airline || "");
                if (cmp !== 0) { return cmp; }
                return (a.AircraftType || "").localeCompare(b.AircraftType || "");
            });

            // Build final data array by iterating and injecting subtotal rows inline
            var aExportData = [];
            var iTotalNumOfFlight = 0, iTotalFlightUnit = 0;
            var mOverallCabinTotals = {};

            var sCurrentAirline = null, sCurrentAircraftType = null;
            var oAirlineTotals = null, oAircraftTypeTotals = null;
            var sAirlineTotalText = this._getI18nText("airlineTotalText");

            for (var i = 0; i < aRawRows.length; i++) {
                var oRow = aRawRows[i];
                var sAirline = oRow.Airline || "";
                var sAircraftType = oRow.AircraftType || "";

                // Airline group break
                if (sAirline !== sCurrentAirline) {
                    // Close previous AircraftType subtotal
                    if (sCurrentAircraftType !== null) {
                        aExportData.push(fnMakeSubRow({
                            Airline: sCurrentAirline,
                            AircraftType: sCurrentAircraftType + " " + sAirlineTotalText
                        }, oAircraftTypeTotals));
                    }
                    // Close previous Airline subtotal
                    if (sCurrentAirline !== null) {
                        aExportData.push(fnMakeSubRow({
                            Airline: sCurrentAirline,
                            FlightNum: sCurrentAirline + " " + sAirlineTotalText
                        }, oAirlineTotals));
                    }
                    sCurrentAirline = sAirline;
                    sCurrentAircraftType = sAircraftType;
                    oAirlineTotals = fnNewTotals();
                    oAircraftTypeTotals = fnNewTotals();

                } else if (sAircraftType !== sCurrentAircraftType) {
                    // AircraftType group break within same Airline
                    if (sCurrentAircraftType !== null) {
                        aExportData.push(fnMakeSubRow({
                            Airline: sCurrentAirline,
                            AircraftType: sCurrentAircraftType + " " + sAirlineTotalText
                        }, oAircraftTypeTotals));
                    }
                    sCurrentAircraftType = sAircraftType;
                    oAircraftTypeTotals = fnNewTotals();
                }

                aExportData.push(oRow);
                fnAddToTotals(oRow, oAircraftTypeTotals);
                fnAddToTotals(oRow, oAirlineTotals);

                // Grand total accumulation
                if (oRow.NumOfFlight != null && !isNaN(oRow.NumOfFlight)) {
                    iTotalNumOfFlight += Number(oRow.NumOfFlight);
                }
                if (oRow.FlightUnit != null && !isNaN(oRow.FlightUnit)) {
                    iTotalFlightUnit += Number(oRow.FlightUnit);
                }
                fnAccumulateCabins(oRow, mOverallCabinTotals);
            }

            // Close last AircraftType subtotal
            if (sCurrentAircraftType !== null) {
                aExportData.push(fnMakeSubRow({
                    Airline: sCurrentAirline,
                    AircraftType: sCurrentAircraftType + " " + sAirlineTotalText
                }, oAircraftTypeTotals));
            }
            // Close last Airline subtotal
            if (sCurrentAirline !== null) {
                aExportData.push(fnMakeSubRow({
                    Airline: sCurrentAirline,
                    FlightNum: sCurrentAirline + " " + sAirlineTotalText
                }, oAirlineTotals));
            }

            // 3. Append grand-total row
            var oOverallRow = {
                FlightNum:   this._getI18nText("summaryTotalText"),
                NumOfFlight: String(iTotalNumOfFlight),
                FlightUnit:  String(iTotalFlightUnit)
            };
            aDynamicColumnInfos.forEach(function (oInfo) {
                oOverallRow[oInfo.property] = String(mOverallCabinTotals[oInfo.class] || 0);
            });
            aExportData.push(oOverallRow);

            oExportSettings.dataSource = { type: "array", data: aExportData };

            // 6. Remove workbook columns whose property is null/empty to prevent framework errors
            //    (multi-label columns added via JS may not carry a valid property reference)
            oExportSettings.workbook.columns = oExportSettings.workbook.columns.filter(function (oCol) {
                return oCol && oCol.property != null && oCol.property !== "";
            });

            // 7. Inject dynamic cabin columns before the TTL column in the workbook
            var aColumns = oExportSettings.workbook.columns;
            var iInsertIndex = -1;
            for (var j = 0; j < aColumns.length; j++) {
                if (aColumns[j].label === "TTL" || TTL_PROPERTIES.indexOf(aColumns[j].property) !== -1) {
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
                    return oObj && oObj.SeatConfig;
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
         * Removes all runtime-added cabin-class columns from the table.
         * Called at the start of every rebind to ensure a clean state.
         */
        _removeDynamicColumns: function (oSmartTable) {
            var oTable = oSmartTable.getTable();
            if (!oTable) { return; }
            oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicCabin");
            }).forEach(function (oCol) {
                oTable.removeColumn(oCol);
                oCol.destroy();
            });
        },

        /**
         * Builds and inserts one AnalyticalColumn per distinct CABIN_CLASS value
         * found in the SeatConfig JSON field.  Columns are inserted immediately before
         * the first TTL / summary column, or appended if not found.
         */
        _addDynamicColumns: function (oSmartTable) {
            var oTable = oSmartTable.getTable();
            var oBinding = oTable.getBinding("rows");
            if (!oBinding) { return; }

            // Remove any leftover dynamic columns before rebuilding
            oTable.getColumns().filter(function (oCol) {
                return oCol.data("dynamicCabin");
            }).forEach(function (oCol) {
                oTable.removeColumn(oCol);
                oCol.destroy();
            });

            // Collect distinct CABIN_CLASS values across all loaded rows
            // SeatConfig structure: [{"CABIN_CLASS":"J","QUANTITY":53}, ...]
            var aCabinClasses = [];
            oBinding.getContexts(0, oBinding.getLength()).forEach(function (oCtx) {
                var oObj = oCtx.getObject();
                if (!oObj || !oObj.SeatConfig) { return; }
                try {
                    JSON.parse(oObj.SeatConfig).forEach(function (oItem) {
                        var sCls = oItem && oItem.CABIN_CLASS;
                        if (sCls && aCabinClasses.indexOf(sCls) === -1) { aCabinClasses.push(sCls); }
                    });
                } catch (e) { /* ignore */ }
            });
            if (!aCabinClasses.length) { return; }

            // Find the index of the first TTL/summary column to use as insertion point
            var aTableCols = oTable.getColumns();
            var iInsertIndex = -1;
            for (var i = 0; i < aTableCols.length; i++) {
                var sLeading = aTableCols[i].getLeadingProperty && aTableCols[i].getLeadingProperty();
                if (TTL_PROPERTIES.indexOf(sLeading) !== -1) {
                    iInsertIndex = i;
                    break;
                }
            }

            var iCount = aCabinClasses.length;
            var sSeatConfiguration = this._getI18nText("seatConfiguration");

            // Create one column per cabin class
            aCabinClasses.forEach(function (sCls, iIdx) {
                var oCol = new Column({
                    leadingProperty: "",
                    grouped: false,
                    summed: false,
                    hAlign: "End",
                    // Two-level header: group label on top, cabin class code below
                    multiLabels: [
                        new Label({ text: sSeatConfiguration, textAlign: "Center", design: "Bold" }),
                        new Label({ text: sCls, textAlign: "Right" })
                    ],
                    // First column spans all siblings; subsequent columns span 1
                    headerSpan: [iCount - iIdx, 1],
                    template: new Text({
                        text: {
                            path: "SeatConfig",
                            formatter: function (sSeatConfig) {
                                if (!sSeatConfig) { return ""; }
                                try {
                                    var aItems = JSON.parse(sSeatConfig);
                                    for (var k = 0; k < aItems.length; k++) {
                                        if (aItems[k].CABIN_CLASS === sCls) {
                                            var v = Number(aItems[k].QUANTITY);
                                            return (isNaN(v) || v === 0) ? "" : String(v);
                                        }
                                    }
                                } catch (e) { /* ignore */ }
                                // No matching entry means zero quantity – show blank
                                return "";
                            }
                        }
                    }),
                    width: "8rem"
                });

                oCol.getTemplate().addStyleClass("cabinDynamicColumn");
                oCol.data("dynamicCabin", true);

                if (iInsertIndex !== -1) {
                    oTable.insertColumn(oCol, iInsertIndex + iIdx);
                } else {
                    oTable.addColumn(oCol);
                }
            });

            oTable.setEnableColumnFreeze(false);
        }

    };

});
