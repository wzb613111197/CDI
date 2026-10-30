/**
 * ObjectPage controller for the Upload Existing Quotation application.
 * Manages the two-section flow:
 *   Section 1 – Upload Excel File
 *   Section 2 – Quotation Detail (pricing workbench)
 *
 * @module zsde005/uploaduptquo/controller/ObjectPage
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/BusyDialog",
    "sap/ui/core/Fragment",
    "com/cathaydining/zsde005/uploaduptquo/model/QuotationExcel"
], (Controller, JSONModel, MessageToast, MessageBox, BusyDialog, Fragment, QuotationExcel) => {
    "use strict";

    return Controller.extend("com.cathaydining.zsde005.uploaduptquo.controller.ObjectPage", {

        /**
         * Builds default Quotation Detail form payload.
         * @returns {object} Initial quotation detail state
         * @private
         */
        _createDefaultQuotationDetail() {
            return {
                items: []
            };
        },

        /**
         * Retrieves a translated text from the i18n resource bundle.
         * @param {string}   sKey   i18n message key
         * @param {string[]} [aArgs] Optional placeholder values
         * @returns {string} Translated text, or the key itself as fallback
         * @private
         */
        _getText(sKey, aArgs) {
            const oI18nModel = this.getOwnerComponent && this.getOwnerComponent().getModel("i18n");
            const oBundle = oI18nModel && oI18nModel.getResourceBundle && oI18nModel.getResourceBundle();
            if (oBundle && oBundle.getText) {
                return oBundle.getText(sKey, aArgs);
            }
            return sKey;
        },

        /**
         * Controller initialization.
         * Creates a local UI JSONModel to hold page state and user inputs.
         */
        onInit() {
            this._oBomTreeDialog = null;

            const oUiModel = new JSONModel({
                uploadEnabled: false,
                quotationDetailVisible: false,
                detailsVisible: false,
                newQuotationVisible: false,
                confirmInProgress: false,
                stepsLocked: false,
                quotationDetail: Object.assign(this._createDefaultQuotationDetail(), {
                    bom: {
                        title: "",
                        tree: [],
                        priceHistory: []
                    }
                })
            });

            this.getView().setModel(oUiModel, "ui");
        },

        /**
         * Convenience accessor for the local UI JSONModel.
         * @returns {sap.ui.model.json.JSONModel} UI model instance
         */
        _getUiModel() {
            return this.getView().getModel("ui");
        },

        _getBool(vValue) {
            return !!vValue;
        },

        _openBusyDialog(sText) {
            if (!this._oBusyDialog) {
                this._oBusyDialog = new BusyDialog();
            }
            this._oBusyDialog.setText(sText || "");
            this._oBusyDialog.open();
        },

        _closeBusyDialog() {
            if (this._oBusyDialog && this._oBusyDialog.close) {
                this._oBusyDialog.close();
            }
        },

        _setUploadSectionBusy(bBusy) {
            const oUploadLayout = this.byId("uploadLayout");
            if (oUploadLayout && oUploadLayout.setBusy) {
                oUploadLayout.setBusy(bBusy);
            }
        },

        _ensureXlsxLoaded() {
            if (window.XLSX) {
                return Promise.resolve(window.XLSX);
            }

            if (this._pXlsxLoader) {
                return this._pXlsxLoader;
            }

            this._pXlsxLoader = new Promise((resolve, reject) => {
                const oExistingScript = document.querySelector("script[data-xlsx-loader='true']");
                if (oExistingScript) {
                    oExistingScript.addEventListener("load", () => resolve(window.XLSX), { once: true });
                    oExistingScript.addEventListener("error", () => reject(new Error("Failed to load XLSX library")), { once: true });
                    return;
                }

                const oScript = document.createElement("script");
                oScript.src = sap.ui.require.toUrl("com/cathaydining/zsde005/uploaduptquo/lib/xlsx.full.min.js");
                oScript.async = true;
                oScript.setAttribute("data-xlsx-loader", "true");
                oScript.onload = () => resolve(window.XLSX);
                oScript.onerror = () => reject(new Error("Failed to load XLSX library"));
                document.head.appendChild(oScript);
            }).catch((oError) => {
                this._pXlsxLoader = null;
                throw oError;
            });

            return this._pXlsxLoader;
        },

        async _runGuarded(mOptions, fnTask) {
            const oUiModel = this._getUiModel();
            const oSource = mOptions && mOptions.source;
            const sFlagPath = mOptions && mOptions.flagPath;
            const bViewBusy = this._getBool(mOptions && mOptions.viewBusy);
            const sBusyDialogText = mOptions && mOptions.busyDialogText;

            if (sFlagPath && oUiModel && oUiModel.getProperty && oUiModel.getProperty(sFlagPath)) {
                return;
            }

            if (sFlagPath && oUiModel && oUiModel.setProperty) {
                oUiModel.setProperty(sFlagPath, true);
            }
            if (oSource && oSource.setEnabled) {
                oSource.setEnabled(false);
            }
            if (bViewBusy) {
                this.getView().setBusy(true);
            }
            if (sBusyDialogText) {
                this._openBusyDialog(sBusyDialogText);
            }

            try {
                return await fnTask();
            } finally {
                if (sBusyDialogText) {
                    this._closeBusyDialog();
                }
                if (bViewBusy) {
                    this.getView().setBusy(false);
                }
                if (oSource && oSource.setEnabled && !(oSource.isDestroyed && oSource.isDestroyed())) {
                    oSource.setEnabled(true);
                }
                if (sFlagPath && oUiModel && oUiModel.setProperty) {
                    oUiModel.setProperty(sFlagPath, false);
                }
            }
        },

        /**
         * Scrolls ObjectPageLayout to the given section.
         * @param {string} sSectionId View-local ID of the ObjectPageSection
         */
        _scrollToSection(sSectionId) {
            const oObjectPage = this.byId("objectPage");
            const oSection = this.byId(sSectionId);
            if (!oObjectPage || !oSection || !oObjectPage.scrollToSection) {
                return;
            }

            const fnScroll = () => {
                if (oSection.getVisible && !oSection.getVisible()) {
                    return;
                }
                if (oObjectPage.setSelectedSection) {
                    oObjectPage.setSelectedSection(oSection.getId());
                }
                oObjectPage.scrollToSection(oSection.getId());
            };

            fnScroll();
            setTimeout(fnScroll, 0);
            setTimeout(fnScroll, 120);
        },

        // ──────────────────────────────────────────────
        //  Section 1 – Upload Excel
        // ──────────────────────────────────────────────

        /**
         * FileUploader change handler – enables the upload button when a file is selected.
         */
        onFileChange(oEvent) {
            const oUiModel = this._getUiModel();
            const sFileName = oEvent.getParameter("newValue");
            oUiModel.setProperty("/uploadEnabled", !!sFileName);
        },

        /**
         * FileUploader type mismatch handler.
         */
        onFileTypeMismatch() {
            MessageBox.error(this._getText("msgFileTypeMismatch"));
        },

        /**
         * Upload button handler – reads the Excel file, parses it via SheetJS, and loads rows into quotation detail.
         */
        onUpload() {
            const oFileUploader = this.byId("excelFileUploader");
            if (!oFileUploader) {
                return;
            }

            const oFileInput = oFileUploader.oFileUpload || document.getElementById(oFileUploader.getId() + "-fu");
            const oFile = oFileInput && oFileInput.files && oFileInput.files[0];
            if (!oFile) {
                MessageToast.show(this._getText("msgNoFileSelected"));
                return;
            }

            this.getView().setBusy(true);
            this._setUploadSectionBusy(true);
            this._ensureXlsxLoaded().then(() => {
                const oReader = new FileReader();
                oReader.onload = (e) => {
                    try {
                        const aData = new Uint8Array(e.target.result);
                        this._processExcelData(aData);
                    } catch (oError) {
                        MessageBox.error(this._getText("msgUploadFailed", [oError.message || oError]));
                        this.getView().setBusy(false);
                    }
                };
                oReader.onerror = () => {
                    MessageBox.error(this._getText("msgUploadFailed", ["File read error"]));
                    this.getView().setBusy(false);
                };
                oReader.readAsArrayBuffer(oFile);
            }).catch((oError) => {
                MessageBox.error(this._getText("msgUploadFailed", [oError.message || oError]));
                this.getView().setBusy(false);
            });
        },

        /**
         * Processes the Excel binary data into quotation detail items.
         * @param {Uint8Array} aData Excel file binary
         * @private
         */
        _processExcelData(aData) {
            try {
                const XLSX = window.XLSX;
                if (!XLSX) {
                    throw new Error("XLSX library is not available");
                }
                const oWorkbook = XLSX.read(aData, { type: "array", cellDates: true });
                const sFirstSheet = oWorkbook.SheetNames[0];
                const oSheet = oWorkbook.Sheets[sFirstSheet];
                const aRows = QuotationExcel.parseSheet(XLSX, oSheet).map((oRow) => {
                    // Legacy Excel mapped "Customer Code" into CustomerName; keep Customer for SaveQuotation/ChangeQuotation.
                    if (!oRow.Customer && oRow.CustomerName) {
                        oRow.Customer = oRow.CustomerName;
                    }
                    return oRow;
                });

                const oUiModel = this._getUiModel();
                oUiModel.setProperty("/quotationDetail/items", aRows);
                oUiModel.setProperty("/quotationDetailVisible", true);

                this._scrollToSection("Section2");
                MessageToast.show(this._getText("msgUploadSuccess", [aRows.length]));
            } catch (oError) {
                MessageBox.error(this._getText("msgUploadFailed", [oError.message || oError]));
            } finally {
                this.getView().setBusy(false);
            }
        },

        _getQDTableSpreadsheetColumns() {
            const oTable = this.byId("qdCurrentQuotationTable");
            if (!oTable || !oTable.getColumns) {
                return [];
            }

            const aBindingProps = ["text", "value", "number", "selected"];
            const aExcludedColumnIds = ["qdColView", "qdColMessage"];
            const aExcludedProperties = ["Message"];

            const aCols = oTable.getColumns().map((oColumn) => {
                const sColumnId = oColumn.getId && oColumn.getId();
                if (aExcludedColumnIds.some((sExcludedId) => sColumnId && sColumnId.endsWith(sExcludedId))) {
                    return null;
                }

                const oLabel = oColumn.getLabel && oColumn.getLabel();
                const sLabel = oLabel && oLabel.getText ? oLabel.getText() : "";
                const oTemplate = oColumn.getTemplate && oColumn.getTemplate();

                if (!oTemplate || !oTemplate.getBindingInfo) {
                    return null;
                }

                let sProperty = "";
                let sType = "String";

                aBindingProps.some((sBindingProp) => {
                    const oBindingInfo = oTemplate.getBindingInfo(sBindingProp);
                    const oPart = oBindingInfo && oBindingInfo.parts && oBindingInfo.parts[0];
                    const sPath = oPart && oPart.path;
                    if (!sPath) {
                        return false;
                    }

                    sProperty = sPath;
                    if (sBindingProp === "selected") {
                        sType = "Boolean";
                    } else if (sBindingProp === "number") {
                        sType = "Number";
                    }

                    return true;
                });

                if (!sLabel || !sProperty) {
                    return null;
                }
                if (aExcludedProperties.includes(sProperty)) {
                    return null;
                }

                return {
                    label: sLabel,
                    property: sProperty,
                    type: sType
                };
            }).filter(Boolean);

            // Excel export order: Quotation, then Quotation Type
            const iQuotationIdx = aCols.findIndex((oCol) => oCol.property === "Quotation");
            const iQTTypeIdx = aCols.findIndex((oCol) => oCol.property === "QTType");
            if (iQuotationIdx >= 0 && iQTTypeIdx >= 0 && iQTTypeIdx !== iQuotationIdx + 1) {
                const aQTTypeCol = aCols.splice(iQTTypeIdx, 1);
                const iInsertAt = iQTTypeIdx < iQuotationIdx ? iQuotationIdx : iQuotationIdx + 1;
                aCols.splice(iInsertAt, 0, aQTTypeCol[0]);
            }
            return aCols;
        },

        /**
         * Download template handler – exports an empty Excel with the expected column headers.
         */
        onDownloadTemplate() {
            this._ensureXlsxLoaded().then((XLSX) => {
                const sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
                const oSheet = QuotationExcel.buildSheet(XLSX, [], sLanguage, false);
                QuotationExcel.writeWorkbook(XLSX, oSheet, "Quotation_Upload_Template.xlsx");
            }).catch((oError) => {
                MessageBox.error(this._getText("msgUploadFailed", [oError.message || oError]));
            });
        },

        // ──────────────────────────────────────────────
        //  Footer navigation
        // ──────────────────────────────────────────────

        /**
         * Previous Step – hides Section 2 and returns to upload section.
         */
        onPrevStep() {
            const oUiModel = this._getUiModel();
            oUiModel.setProperty("/quotationDetailVisible", false);
            oUiModel.setProperty("/stepsLocked", false);
            this._setUploadSectionBusy(false);
            this._scrollToSection("Section1");
        },

        /**
         * Reset – clears all data and returns to Section 1.
         */
        onReset() {
            const oUiModel = this._getUiModel();
            oUiModel.setProperty("/quotationDetailVisible", false);
            oUiModel.setProperty("/stepsLocked", false);
            oUiModel.setProperty("/uploadEnabled", false);
            this._setUploadSectionBusy(false);
            oUiModel.setProperty("/quotationDetail", Object.assign(this._createDefaultQuotationDetail(), {
                bom: { title: "", tree: [], priceHistory: [] }
            }));

            const oFileUploader = this.byId("excelFileUploader");
            if (oFileUploader && oFileUploader.clear) {
                oFileUploader.clear();
            }

            this._scrollToSection("Section1");
        },

        // ──────────────────────────────────────────────
        //  Section 2 – Quotation Detail handlers
        // ──────────────────────────────────────────────

        /**
         * Handler for footer "Save Quotation" button.
         */
        async onQDSaveQuotation(oEvent) {
            const oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            const oUiModel = this._getUiModel();
            const oModel = this.getView().getModel();
            const aItems = oUiModel.getProperty("/quotationDetail/items") || [];

            if (oUiModel.getProperty("/confirmInProgress")) {
                return;
            }

            if (!oModel) {
                MessageBox.error(this._getText("msgChangeQuotationFailed", ["Model not available"]));
                return;
            }

            if (!aItems.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            await this._runGuarded({
                source: oSource,
                flagPath: "/confirmInProgress",
                viewBusy: true,
                busyDialogText: this._getText("msgSavingQuotationInProgress")
            }, async () => {
                const oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.ChangeQuotation(...)");
                oActionBinding.setParameter("Type", "");
                oActionBinding.setParameter("Message", "");
                oActionBinding.setParameter("_quotation", aItems.map((oItem) => this._mapQDItemToChangeQuotationParam(oItem)));

                await oActionBinding.execute();

                const vActionResult = await this._requestActionResult(oActionBinding);
                const aRootResults = this._normalizeActionResultArray(vActionResult);
                this._applyChangeQuotationResult(oUiModel, aRootResults);

                const sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                MessageToast.show(this._getText("msgChangeQuotationSuccess"));
            }).catch((oError) => {
                MessageBox.error(this._getText("msgChangeQuotationFailed", [this._extractErrorMessage(oError)]));
            });
        },

        /**
         * Maps a quotation detail row to ZA_SD_UPLOAD_QT.
         * Excel rows still use Quotation, LoadingTempCode, ValidFrom and ValidTo.
         * @param {object} oItem Quotation detail row
         * @returns {object} ChangeQuotation _quotation row
         * @private
         */
        _mapQDItemToChangeQuotationParam(oItem) {
            const sItemValidFrom = oItem.ValidFrom || oItem.ItemValidFrom;
            const sItemValidTo = oItem.ValidTo || oItem.ItemValidTo;
            const sHeaderValidFrom = oItem.HeaderValidFrom || sItemValidFrom;
            const sHeaderValidTo = oItem.HeaderValidTo || sItemValidTo;
            const dec = (v) => this._toEdmDecimalValue(v);
            const dec4 = (v) => this._toEdmDecimalValue(v, 4);
            const str = (v) => (v === undefined || v === null || v === "" ? "" : String(v).trim());

            return {
                QTNumber: str(oItem.QTNumber || oItem.Quotation),
                QTType: str(oItem.QTType),
                DeleteFlag: !!oItem.DeleteFlag,
                SalesOrg: str(oItem.SalesOrg),
                DistChannel: str(oItem.DistChannel),
                Division: str(oItem.Division),
                HeaderDesc: str(oItem.HeaderDesc),
                Customer: str(oItem.Customer),
                CustomerName: str(oItem.CustomerName),
                AirlineCode: str(oItem.AirlineCode),
                ValidFrom: this._toEdmDateValue(sHeaderValidFrom),
                ValidTo: this._toEdmDateValue(sHeaderValidTo),
                ContractNo: str(oItem.ContractNo),
                Sequence: str(oItem.Sequence),
                Item: str(oItem.Item),
                MaterialType: str(oItem.MaterialType),
                Material: str(oItem.Material),
                MaterialStatus: str(oItem.MaterialStatus),
                BomStatus: str(oItem.BomStatus),
                Description: str(oItem.Description),
                CabinClass: str(oItem.CabinClass),
                CostRunDate: this._toEdmDateValue(oItem.CostRunDate),
                QTStatus: str(oItem.QTStatus),
                ComponentSequence: str(oItem.ComponentSequence),
                ItemRemark: str(oItem.ItemRemark),
                Variant: str(oItem.Variant),
                YieldedFoodCost: dec(oItem.YieldedFoodCost),
                LabourMM: dec(oItem.LabourMM),
                LabourRate: dec(oItem.LabourRate),
                LabourPrice: dec(oItem.LabourPrice),
                Overhead: dec(oItem.Overhead),
                Total: dec(oItem.Total),
                STVariant: str(oItem.STVariant),
                YieldedStandardFoodCost: dec(oItem.YieldedStandardFoodCost),
                MarkUpPercent: dec4(oItem.MarkUpPercent),
                STMarkUp: dec(oItem.STMarkUp),
                STLabourMM: dec(oItem.STLabourMM),
                LabourCostRate: dec(oItem.LabourCostRate),
                LabourCost: dec(oItem.LabourCost),
                LabourMMAdjustment: dec4(oItem.LabourMMAdjustment),
                AdjustedLabourMM: dec(oItem.AdjustedLabourMM),
                LabourMMAdjFix: dec(oItem.LabourMMAdjFix),
                LabourSellRate: dec(oItem.LabourSellRate),
                STLabourPrice: dec(oItem.STLabourPrice),
                STOverHead: dec(oItem.STOverHead),
                STOverHeadPercent: dec4(oItem.STOverHeadPercent),
                AdjustedOverhead: dec(oItem.AdjustedOverhead),
                OtherAdjustment: dec(oItem.OtherAdjustment),
                STTotal: dec(oItem.STTotal),
                SalesPriceFood: dec(oItem.SalesPriceFood),
                SalesPriceLabour: dec(oItem.SalesPriceLabour),
                SalesPriceOverhead: dec(oItem.SalesPriceOverhead),
                TotalSellingPrice: dec(oItem.TotalSellingPrice),
                FreeofCharge: !!oItem.FreeofCharge,
                GrossProfit: dec(oItem.GrossProfit),
                GrossProfitPercent: dec4(oItem.GrossProfitPercent),
                NetMargin: dec(oItem.NetMargin),
                NetMarginPercent: dec4(oItem.NetMarginPercent),
                QuotedPrice: dec(oItem.QuotedPrice),
                IncrementPercent: dec4(oItem.IncrementPercent),
                ProposedNewPrice: dec(oItem.ProposedNewPrice),
                SMPLPercent: dec4(oItem.SMPLPercent),
                SMPLRatio: dec4(oItem.SMPLRatio),
                PrecedingQT: !!oItem.PrecedingQT,
                Currency: str(oItem.Currency),
                ItemValidFrom: this._toEdmDateValue(sItemValidFrom),
                ItemValidTo: this._toEdmDateValue(sItemValidTo),
                DiffPrevQTPrice: dec(oItem.DiffPrevQTPrice),
                PrevQT: str(oItem.PrevQT),
                PrevQTItem: str(oItem.PrevQTItem),
                PreQTPrice: dec(oItem.PreQTPrice),
                PrevQTCost: dec(oItem.PrevQTCost),
                Margin: dec(oItem.Margin),
                MarginPercnt: dec4(oItem.MarginPercnt),
                PrevValidFrom: this._toEdmDateValue(oItem.PrevValidFrom),
                PrevValidTo: this._toEdmDateValue(oItem.PrevValidTo),
                ComponentID: str(oItem.ComponentID),
                Editable: !!oItem.Editable,
                Message: str(oItem.Message),
                Type: str(oItem.Type),
                LdgTempCode: str(oItem.LdgTempCode || oItem.LoadingTempCode),
                MealType: str(oItem.MealType)
            };
        },

        /**
         * Replaces the current quotation table with ChangeQuotation _quotation.
         * Keeps Excel aliases so existing column bindings still resolve.
         * @param {sap.ui.model.json.JSONModel} oUiModel UI model
         * @param {object[]} aRootResults Normalized action result
         * @private
         */
        _applyChangeQuotationResult(oUiModel, aRootResults) {
            const oRoot = aRootResults && aRootResults[0];
            if (!oRoot || !Array.isArray(oRoot._quotation)) {
                return;
            }

            const aItems = oRoot._quotation.map((oRow) => {
                const oItem = Object.assign({}, oRow || {});
                delete oItem.root;
                oItem.Quotation = oItem.QTNumber || oItem.Quotation || "";
                oItem.LoadingTempCode = oItem.LdgTempCode || oItem.LoadingTempCode || "";
                oItem.HeaderValidFrom = oItem.ValidFrom || null;
                oItem.HeaderValidTo = oItem.ValidTo || null;
                oItem.ItemValidFrom = oItem.ItemValidFrom || oItem.ValidFrom || null;
                oItem.ItemValidTo = oItem.ItemValidTo || oItem.ValidTo || null;
                oItem.ValidFrom = oItem.ItemValidFrom;
                oItem.ValidTo = oItem.ItemValidTo;
                return oItem;
            });
            oUiModel.setProperty("/quotationDetail/items", aItems);
        },

        /**
         * Handler for "Export" button on the Current Quotation table.
         */
        onQDExport() {
            const oUiModel = this._getUiModel();
            const aItems = oUiModel.getProperty("/quotationDetail/items") || [];
            if (!aItems.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            const aCols = this._getQDTableSpreadsheetColumns();
            if (!aCols.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            sap.ui.require(["sap/ui/export/Spreadsheet"], (Spreadsheet) => {
                const oSettings = {
                    workbook: { columns: aCols },
                    dataSource: aItems,
                    fileName: this._getText("qdExportFileName") + ".xlsx"
                };
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(() => oSheet.destroy());
            });
        },

        /**
         * Handler for "[View]" link in the Current Quotation table.
         * Opens BOM tree dialog for the selected item.
         */
        async onQDViewItem(oEvent) {
            const oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            const oCtx = oSource && oSource.getBindingContext ? oSource.getBindingContext("ui") : null;
            const oCurrentItem = oCtx && oCtx.getObject ? (oCtx.getObject() || {}) : {};

            const oUiModel = this._getUiModel();
            const oModel = this.getView().getModel();
            if (!oModel) {
                MessageBox.error(this._getText("msgUploadFailed", ["Model not available"]));
                return;
            }

            const mParams = {
                Material: oCurrentItem.Material || "",
                SalesOrg: oCurrentItem.SalesOrg || "",
                DistChannel: oCurrentItem.DistChannel || "",
                Division: oCurrentItem.Division || "",
                Customer: oCurrentItem.Customer || "",
                EffectiveFrom: this._toEdmDateValue(oCurrentItem.EffectiveFrom || oCurrentItem.ValidFrom)
            };

            if (!mParams.Material) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            let bSuccess = false;
            let aBomItems = [];
            let aPriceHistory = [];
            await this._runGuarded({
                source: oSource,
                flagPath: "/confirmInProgress",
                viewBusy: true
            }, async () => {
                const oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetBOM(...)");
                Object.keys(mParams).forEach((sKey) => oActionBinding.setParameter(sKey, mParams[sKey]));
                await oActionBinding.execute();

                const vActionResult = await this._requestActionResult(oActionBinding);
                const aRootResults = this._normalizeActionResultArray(vActionResult);
                const sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                const oRoot = aRootResults[0] || {};
                aBomItems = Array.isArray(oRoot._bomList) ? oRoot._bomList : [];
                aPriceHistory = Array.isArray(oRoot._priceHistory) ? oRoot._priceHistory : [];
                bSuccess = true;
            }).catch((oError) => {
                MessageBox.error(this._getText("msgUploadFailed", [this._extractErrorMessage(oError)]));
            });

            if (!bSuccess) {
                return;
            }

            const aTree = this._buildBomTreeData(aBomItems);
            oUiModel.setProperty("/quotationDetail/bom", {
                title: mParams.Material,
                tree: aTree,
                priceHistory: aPriceHistory
            });
            this._openBomTreeDialog();
        },

        // ──────────────────────────────────────────────
        //  BOM Tree Dialog
        // ──────────────────────────────────────────────

        /**
         * Builds a tree structure for TreeTable from flat BOM items.
         * @param {object[]} aItems Flat BOM rows
         * @returns {object[]} Root tree nodes
         * @private
         */
        _buildBomTreeData(aItems) {
            const aRows = Array.isArray(aItems) ? aItems : [];

            const mNodesByLevelPred = new Map();
            const aNodes = aRows.map((oRow, iIdx) => {
                const iLevel = Number(oRow && oRow.BomLevel);
                const iPred = Number(oRow && oRow.PathPredecessor);
                const iParentPred = Number(oRow && oRow.ParentPath);

                const sKey = [String(iLevel), String(iPred)].join("-");
                const oNode = {
                    key: sKey,
                    BomLevel: isNaN(iLevel) ? "" : iLevel,
                    PathPredecessor: isNaN(iPred) ? "" : iPred,
                    ParentPath: isNaN(iParentPred) ? "" : iParentPred,
                    Material: (oRow && oRow.Material) || "",
                    MaterialDesc: (oRow && oRow.MaterialDesc) || "",
                    _index: iIdx,
                    children: []
                };
                mNodesByLevelPred.set(sKey, oNode);
                return oNode;
            });

            const aRoots = [];
            aNodes.forEach((oNode) => {
                const iLevel = Number(oNode.BomLevel);
                const iParentPred = Number(oNode.ParentPath);
                const sParentKey = [String(iLevel - 1), String(iParentPred)].join("-");

                if (iLevel > 0 && mNodesByLevelPred.has(sParentKey)) {
                    mNodesByLevelPred.get(sParentKey).children.push(oNode);
                } else {
                    aRoots.push(oNode);
                }
            });

            return aRoots;
        },

        /**
         * Opens BOM Tree dialog.
         * @private
         */
        _openBomTreeDialog() {
            const oView = this.getView();

            if (this._oBomTreeDialog) {
                this._oBomTreeDialog.open();
                const oTreeTable = this.byId("bomTreeTable");
                if (oTreeTable && oTreeTable.expandToLevel) {
                    oTreeTable.expandToLevel(1);
                }
                return;
            }

            Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.uploaduptquo.view.fragments.BomTreeView",
                controller: this
            }).then((oDialog) => {
                this._oBomTreeDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
                const oTreeTable = this.byId("bomTreeTable");
                if (oTreeTable && oTreeTable.expandToLevel) {
                    oTreeTable.expandToLevel(1);
                }
            });
        },

        /**
         * Close handler for BOM Tree dialog.
         */
        onCloseBomTreeDialog() {
            if (this._oBomTreeDialog && this._oBomTreeDialog.close) {
                this._oBomTreeDialog.close();
            }
        },

        // ──────────────────────────────────────────────
        //  OData action result helpers
        // ──────────────────────────────────────────────

        /**
         * Reads the result object from an executed OData V4 action binding.
         * @param {sap.ui.model.odata.v4.ODataContextBinding} oActionBinding
         * @returns {Promise<object>}
         * @private
         */
        async _requestActionResult(oActionBinding) {
            const oContext = oActionBinding.getBoundContext();
            if (!oContext) {
                return null;
            }
            try {
                return await oContext.requestObject();
            } catch (e) {
                return oContext.getObject();
            }
        },

        /**
         * Normalizes action result into an array.
         * @param {*} vResult
         * @returns {object[]}
         * @private
         */
        _normalizeActionResultArray(vResult) {
            if (Array.isArray(vResult)) {
                return vResult;
            }
            if (vResult && typeof vResult === "object" && vResult.value && Array.isArray(vResult.value)) {
                return vResult.value;
            }
            if (vResult && typeof vResult === "object") {
                return [vResult];
            }
            return [];
        },

        /**
         * Extracts business error from action result.
         * @param {object[]} aResults
         * @returns {string|null}
         * @private
         */
        _extractActionBusinessError(aResults) {
            if (!aResults || !aResults.length) {
                return null;
            }
            const oFirst = aResults[0];
            if (oFirst && oFirst.Type === "E" && oFirst.Message) {
                return oFirst.Message;
            }
            const aItems = oFirst && oFirst._quotation;
            if (Array.isArray(aItems)) {
                const oErrItem = aItems.find((oItem) => oItem && oItem.Type === "E" && oItem.Message);
                if (oErrItem) {
                    return oErrItem.Message;
                }
            }
            return null;
        },

        /**
         * Extracts error message from an Error or object.
         * @param {*} oError
         * @returns {string}
         * @private
         */
        _extractErrorMessage(oError) {
            if (!oError) {
                return "";
            }
            if (typeof oError === "string") {
                return oError;
            }
            return oError.message || oError.statusText || JSON.stringify(oError);
        },

        /**
         * Converts a date value to OData Edm.Date string (YYYY-MM-DD).
         * @param {*} vDate
         * @returns {string|null}
         * @private
         */
        _toEdmDateValue(vDate) {
            if (!vDate) {
                return null;
            }
            if (typeof vDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(vDate)) {
                return vDate.substring(0, 10);
            }
            const oDate = vDate instanceof Date ? vDate : new Date(vDate);
            if (isNaN(oDate.getTime())) {
                return null;
            }
            const sYear = String(oDate.getFullYear());
            const sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
            const sDay = String(oDate.getDate()).padStart(2, "0");
            return sYear + "-" + sMonth + "-" + sDay;
        },

        /**
         * Converts a numeric value to OData Edm.Decimal JSON string.
         * Empty / invalid values become "0" (fields are non-nullable).
         * @param {*} vValue
         * @param {number} [iScale] Optional fixed scale (e.g. 4 for percent fields)
         * @returns {string}
         * @private
         */
        _toEdmDecimalValue(vValue, iScale) {
            if (vValue === undefined || vValue === null || vValue === "") {
                return typeof iScale === "number" ? (0).toFixed(iScale) : "0";
            }
            let nValue;
            if (typeof vValue === "number") {
                nValue = vValue;
            } else {
                const sTrimmed = String(vValue).trim().replace(/,/g, "");
                if (sTrimmed === "") {
                    return typeof iScale === "number" ? (0).toFixed(iScale) : "0";
                }
                nValue = parseFloat(sTrimmed);
            }
            if (!Number.isFinite(nValue)) {
                return typeof iScale === "number" ? (0).toFixed(iScale) : "0";
            }
            if (typeof iScale === "number" && iScale >= 0) {
                const nFactor = Math.pow(10, iScale);
                nValue = Math.round((nValue + Number.EPSILON) * nFactor) / nFactor;
                return nValue.toFixed(iScale);
            }
            return String(nValue);
        },

        /**
         * Rows-updated handler to hide ProgressIndicator state icons.
         */
        onQDTableRowsUpdated() {
            var oTable = this.byId("qdCurrentQuotationTable");
            if (!oTable) { return; }
            var oDomRef = oTable.getDomRef();
            if (!oDomRef) { return; }
            var aIcons = oDomRef.querySelectorAll(".sapMPI span[id$='-icon']");
            aIcons.forEach(function (oIcon) { oIcon.style.display = "none"; });
        }

    });
});