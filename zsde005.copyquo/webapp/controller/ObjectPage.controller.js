/**
 * ObjectPage controller for Copy Existing Quotation.
 * Two-step flow:
 *   Step 1 – Copy criteria (quotation, increment, validity)
 *   Step 2 – Pricing workbench (review / simulate / save)
 *
 * @module zsde005/copyquo/controller/ObjectPage
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/BusyDialog",
    "sap/ui/core/Fragment",
    "sap/ui/core/ValueState"
], (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, BusyDialog, Fragment, ValueState) => {
    "use strict";

    return Controller.extend("com.cathaydining.zsde005.copyquo.controller.ObjectPage", {

        /**
         * Builds default Quotation Detail form payload.
         * @returns {object} Initial quotation detail state
         * @private
         */
        _createDefaultQuotationDetail() {
            return {
                addMaterial: "",
                stdMarkUp: "",
                labourSellRate: "",
                labourMMAdjPercent: "",
                labourMMAdjValue: "",
                overheadAdj: "",
                indirectLabourVarAdj: "",
                indirectFixAdj: "",
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
            this._oMaterialVHDialog = null;
            this._oContractVHDialog = null;

            const oUiModel = new JSONModel({
                quotationDetailVisible: false,
                detailsVisible: false,
                newQuotationVisible: false,
                confirmInProgress: false,
                stepsLocked: false,
                copyContext: {
                    quotationNo: "",
                    description: "",
                    contractNo: "",
                    increment: "",
                    validFrom: "",
                    validTo: "",
                    itemCount: 0
                },
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
            const oUploadLayout = this.byId("Section1");
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
                oScript.src = sap.ui.require.toUrl("com/cathaydining/zsde005/zsde005.copyquo/lib/xlsx.full.min.js");
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
         * Copy button – copy existing quotation, then apply Valid From/To, Description, ContractNo, Increment %, Proposed New Price.
         */
        onCopy() {
            const oUiModel = this._getUiModel();
            const oIncrementInput = this.byId("incrementInput");
            const oQuotationNoInput = this.byId("quotationNoInput");
            const oDescriptionInput = this.byId("descriptionInput");
            const oContractNoInput = this.byId("contractNoInput");
            const oValidFrom = this.byId("validFromDatePicker");
            const oValidTo = this.byId("validToDatePicker");
            const oModel = this.getView().getModel();

            const sIncrement = String(oIncrementInput && oIncrementInput.getValue ? oIncrementInput.getValue() : "").trim();
            const sQuotationNo = String(oQuotationNoInput && oQuotationNoInput.getValue ? oQuotationNoInput.getValue() : "").trim();
            const sDescription = String(oDescriptionInput && oDescriptionInput.getValue ? oDescriptionInput.getValue() : "").trim();
            const sContractNo = String(oContractNoInput && oContractNoInput.getValue ? oContractNoInput.getValue() : "").trim();
            const sValidFrom = this._toEdmDateValue(oValidFrom && oValidFrom.getValue ? oValidFrom.getValue() : "");
            const sValidTo = this._toEdmDateValue(oValidTo && oValidTo.getValue ? oValidTo.getValue() : "");
            let bHasError = false;

            [oIncrementInput, oQuotationNoInput, oDescriptionInput, oContractNoInput, oValidFrom, oValidTo].forEach((oCtrl) => {
                if (oCtrl && oCtrl.setValueState) {
                    oCtrl.setValueState(ValueState.None);
                    oCtrl.setValueStateText("");
                }
            });

            if (!sIncrement) {
                if (oIncrementInput && oIncrementInput.setValueState) {
                    oIncrementInput.setValueState(ValueState.Error);
                    oIncrementInput.setValueStateText(this._getText("msgNoIncrementEntered"));
                }
                bHasError = true;
            }
            if (!sQuotationNo) {
                if (oQuotationNoInput && oQuotationNoInput.setValueState) {
                    oQuotationNoInput.setValueState(ValueState.Error);
                    oQuotationNoInput.setValueStateText(this._getText("msgNoQuotationNoEntered"));
                }
                bHasError = true;
            }
            if (!sDescription) {
                if (oDescriptionInput && oDescriptionInput.setValueState) {
                    oDescriptionInput.setValueState(ValueState.Error);
                    oDescriptionInput.setValueStateText(this._getText("msgNoDescriptionEntered"));
                }
                bHasError = true;
            }
            if (!sContractNo) {
                if (oContractNoInput && oContractNoInput.setValueState) {
                    oContractNoInput.setValueState(ValueState.Error);
                    oContractNoInput.setValueStateText(this._getText("msgNoContractNoEntered"));
                }
                bHasError = true;
            }
            if (!sValidFrom) {
                if (oValidFrom && oValidFrom.setValueState) {
                    oValidFrom.setValueState(ValueState.Error);
                    oValidFrom.setValueStateText(this._getText("msgNoValidFromEntered"));
                }
                bHasError = true;
            } else {
                const sToday = this._toEdmDateValue(new Date());
                if (sToday && sValidFrom < sToday) {
                    if (oValidFrom && oValidFrom.setValueState) {
                        oValidFrom.setValueState(ValueState.Error);
                        oValidFrom.setValueStateText(this._getText("msgValidFromNotBeforeToday"));
                    }
                    bHasError = true;
                }
            }
            if (!sValidTo) {
                if (oValidTo && oValidTo.setValueState) {
                    oValidTo.setValueState(ValueState.Error);
                    oValidTo.setValueStateText(this._getText("msgNoValidToEntered"));
                }
                bHasError = true;
            }
            if (sValidFrom && sValidTo && sValidFrom > sValidTo) {
                if (oValidFrom && oValidFrom.setValueState) {
                    oValidFrom.setValueState(ValueState.Error);
                    oValidFrom.setValueStateText(this._getText("msgValidFromAfterValidTo"));
                }
                if (oValidTo && oValidTo.setValueState) {
                    oValidTo.setValueState(ValueState.Error);
                    oValidTo.setValueStateText(this._getText("msgValidToBeforeValidFrom"));
                }
                bHasError = true;
            }

            if (bHasError) {
                MessageToast.show(this._getText("msgRequiredFields"));
                return;
            }

            this._runGuarded({
                flagPath: "/confirmInProgress",
                viewBusy: true
            }, async () => {
                const oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.CopyQuotation(...)");
                oActionBinding.setParameter("IncrementPercentage", sIncrement);
                oActionBinding.setParameter("GrossProfitMode", false);
                oActionBinding.setParameter("QuotationNo", sQuotationNo);
                await oActionBinding.execute();

                const vActionResult = await this._requestActionResult(oActionBinding);
                const aRootResults = this._normalizeActionResultArray(vActionResult);
                const sBusinessError = this._extractActionBusinessError(aRootResults);
                const aQuotationItems = aRootResults[0] && Array.isArray(aRootResults[0]._quotation) ? aRootResults[0]._quotation : [];

                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                if (!aQuotationItems.length) {
                    throw new Error("No quotation items returned");
                }

                const aPrepared = this._prepareCopiedQuotationItems(aQuotationItems, sIncrement, sValidFrom, sValidTo, sDescription, sContractNo);
                oUiModel.setProperty("/quotationDetail/items", aPrepared);
                oUiModel.setProperty("/copyContext", {
                    quotationNo: sQuotationNo,
                    description: sDescription,
                    contractNo: sContractNo,
                    increment: sIncrement,
                    validFrom: sValidFrom,
                    validTo: sValidTo,
                    itemCount: aPrepared.length
                });
                oUiModel.setProperty("/quotationDetailVisible", true);
                oUiModel.setProperty("/stepsLocked", true);
                this._setUploadSectionBusy(false);
                this._scrollToSection("Section2");
            }).catch((oError) => {
                this._setUploadSectionBusy(false);
                MessageBox.error(this._getText("msgCopyFailed", [this._extractErrorMessage(oError)]));
            });
        },

        /**
         * After CopyQuotation: apply manual Valid From/To, HeaderDesc, ContractNo, Increment %, Proposed New Price.
         * ProposedNewPrice = QuotedPrice * (1 + Increment%/100)
         * @param {object[]} aItems
         * @param {string} sIncrement
         * @param {string} sValidFrom
         * @param {string} sValidTo
         * @param {string} sDescription maps to HeaderDesc
         * @param {string} sContractNo
         * @returns {object[]}
         * @private
         */
        _prepareCopiedQuotationItems(aItems, sIncrement, sValidFrom, sValidTo, sDescription, sContractNo) {
            const fIncrPct = parseFloat(sIncrement) || 0;
            return (aItems || []).map((oItem) => {
                const oRow = Object.assign({}, oItem);
                const fQuotedPrice = parseFloat(oRow.QuotedPrice) || 0;
                oRow.ValidFrom = sValidFrom;
                oRow.ValidTo = sValidTo;
                oRow.HeaderDesc = sDescription;
                oRow.ContractNo = sContractNo;
                oRow.IncrementPercent = String(sIncrement);
                oRow.ProposedNewPrice = String((fQuotedPrice * (1 + fIncrPct / 100)).toFixed(2));
                return oRow;
            });
        },



        _getQDTableSpreadsheetColumns() {
            const oTable = this.byId("qdCurrentQuotationTable");
            if (!oTable || !oTable.getColumns) {
                return [];
            }

            const aBindingProps = ["text", "value", "number", "selected"];
            const aExcludedColumnIds = ["qdColView", "qdColMessage"];
            const aExcludedProperties = ["Message"];

            return oTable.getColumns().map((oColumn) => {
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
        },

        /**
         * Download template handler – exports an empty Excel with the expected column headers.
         */
        onDownloadTemplate() {
            const aCols = this._getQDTableSpreadsheetColumns();
            if (!aCols.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            const oTemplateRow = aCols.reduce((oResult, oCol) => {
                oResult[oCol.property] = "";
                return oResult;
            }, {});

            sap.ui.require(["sap/ui/export/Spreadsheet"], (Spreadsheet) => {
                const oSettings = {
                    workbook: { columns: aCols },
                    dataSource: [oTemplateRow],
                    fileName: "Quotation_Upload_Template.xlsx"
                };
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(() => oSheet.destroy());
            });
        },

        // ──────────────────────────────────────────────
        //  Footer navigation
        // ──────────────────────────────────────────────

        /**
         * Previous Step – hides Section 2 and returns to copy criteria.
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
            this._setUploadSectionBusy(false);
            oUiModel.setProperty("/copyContext", {
                quotationNo: "",
                description: "",
                contractNo: "",
                increment: "",
                validFrom: "",
                validTo: "",
                itemCount: 0
            });
            oUiModel.setProperty("/quotationDetail", Object.assign(this._createDefaultQuotationDetail(), {
                bom: { title: "", tree: [], priceHistory: [] }
            }));

            const aClearIds = ["incrementInput", "quotationNoInput", "descriptionInput", "contractNoInput", "validFromDatePicker", "validToDatePicker"];
            aClearIds.forEach((sId) => {
                const oCtrl = this.byId(sId);
                if (!oCtrl) {
                    return;
                }
                if (oCtrl.setValue) {
                    oCtrl.setValue("");
                }
                if (oCtrl.setValueState) {
                    oCtrl.setValueState(ValueState.None);
                    oCtrl.setValueStateText("");
                }
            });

            this._scrollToSection("Section1");
        },

        // ──────────────────────────────────────────────
        //  Section 2 – Quotation Detail handlers
        // ──────────────────────────────────────────────

        /**
         * Handler for "Add" button in QuotationDetail toolbar.
         * Adds material to the current quotation via OData action.
         */
        async onQDAddMaterial(oEvent) {
            const oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            const oUiModel = this._getUiModel();
            const oModel = this.getView().getModel();

            const sMaterial = String(oUiModel.getProperty("/quotationDetail/addMaterial") || "").trim();
            const oAddInput = this.byId("qdAddMaterialInput");
            if (!sMaterial) {
                if (oAddInput && oAddInput.setValueState) {
                    oAddInput.setValueState(ValueState.Error);
                    oAddInput.setValueStateText(this._getText("msgNoFileSelected"));
                }
                MessageToast.show(this._getText("msgNoFileSelected"));
                return;
            }
            if (oAddInput && oAddInput.setValueState) {
                oAddInput.setValueState(ValueState.None);
            }

            if (!oModel) {
                MessageBox.error(this._getText("msgUploadFailed", ["Model not available"]));
                return;
            }

            await this._runGuarded({
                source: oSource,
                flagPath: "/confirmInProgress",
                viewBusy: true
            }, async () => {
                const oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetQuotation(...)");
                const aItems = oUiModel.getProperty("/quotationDetail/items") || [];
                const aMaterialList = aItems.map((oRow) => ({
                    Material: oRow.Material || "",
                    MaterialType: oRow.MaterialType || "",
                    MaterialStatus: oRow.MaterialStatus || "",
                    CabinClass: oRow.CabinClass || "",
                    BomStatus: oRow.BomStatus || "",
                    Description: oRow.Description || "",
                    AirlineCode: oRow.AirlineCode || ""
                }));
                aMaterialList.push({
                    Material: sMaterial,
                    MaterialType: "",
                    MaterialStatus: "",
                    CabinClass: "",
                    BomStatus: "",
                    Description: "",
                    AirlineCode: ""
                });

                oActionBinding.setParameter("ContractNo", "");
                oActionBinding.setParameter("GrossProfitMode", false);
                oActionBinding.setParameter("RoundUp", false);
                oActionBinding.setParameter("SalesOrg", "");
                oActionBinding.setParameter("DistChannel", "");
                oActionBinding.setParameter("Division", "");
                oActionBinding.setParameter("Customer", "");
                oActionBinding.setParameter("EffectiveFrom", null);
                oActionBinding.setParameter("EffectiveTo", null);
                oActionBinding.setParameter("AirlineCode", "");
                oActionBinding.setParameter("_materialList", aMaterialList);
                await oActionBinding.execute();

                const vActionResult = await this._requestActionResult(oActionBinding);
                const aRootResults = this._normalizeActionResultArray(vActionResult);
                const sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }
                oUiModel.setProperty("/quotationDetail/items", aRootResults[0]._quotation);
                oUiModel.setProperty("/quotationDetail/addMaterial", "");
            }).catch((oError) => {
                MessageBox.error(this._getText("msgUploadFailed", [this._extractErrorMessage(oError)]));
            });
        },

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
                // On save: move Proposed New Price → Quoted Price
                const aSaveItems = aItems.map((oItem) => {
                    const oMapped = this._mapQDItemToChangeQuotationParam(oItem);
                    if (oMapped.ProposedNewPrice !== undefined && oMapped.ProposedNewPrice !== null && oMapped.ProposedNewPrice !== "") {
                        oMapped.QuotedPrice = oMapped.ProposedNewPrice;
                    }
                    return oMapped;
                });

                const oActionBinding = oModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.SaveQuotation(...)");
                oActionBinding.setParameter("Type", "");
                oActionBinding.setParameter("Message", "");
                oActionBinding.setParameter("_quotation", aSaveItems);

                await oActionBinding.execute();

                const vActionResult = await this._requestActionResult(oActionBinding);
                const aRootResults = this._normalizeActionResultArray(vActionResult);
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
         * Maps a quotation detail row to ChangeQuotation deep parameter row.
         * @param {object} oItem Quotation detail row
         * @returns {object} ChangeQuotation _quotation row
         * @private
         */
        _mapQDItemToChangeQuotationParam(oItem) {
            return {
                QTType: oItem.QTType,
                Quotation: oItem.Quotation,
                Item: oItem.Item,
                DeleteFlag: oItem.DeleteFlag,
                SalesOrg: oItem.SalesOrg,
                DistChannel: oItem.DistChannel,
                Division: oItem.Division,
                HeaderDesc: oItem.HeaderDesc,
                Customer: oItem.Customer,
                CustomerName: oItem.CustomerName,
                AirlineCode: oItem.AirlineCode,
                MaterialType: oItem.MaterialType,
                Material: oItem.Material,
                MaterialStatus: oItem.MaterialStatus,
                BomStatus: oItem.BomStatus,
                Description: oItem.Description,
                CabinClass: oItem.CabinClass,
                QTStatus: oItem.QTStatus,
                ContractNo: oItem.ContractNo,
                Sequence: oItem.Sequence,
                ItemRemark: oItem.ItemRemark,
                Variant: oItem.Variant,
                YieldedFoodCost: oItem.YieldedFoodCost,
                LabourMM: oItem.LabourMM,
                LabourPrice: oItem.LabourPrice,
                Overhead: oItem.Overhead,
                IndirectLabourVar: oItem.IndirectLabourVar,
                IndirectFixed: oItem.IndirectFixed,
                Total: oItem.Total,
                STVariant: oItem.STVariant,
                YieldedStandardFoodCost: oItem.YieldedStandardFoodCost,
                MarkUpPercent: oItem.MarkUpPercent,
                STMarkUp: oItem.STMarkUp,
                STLabourMM: oItem.STLabourMM,
                LabourCostRate: oItem.LabourCostRate,
                LabourCost: oItem.LabourCost,
                LabourMMAdjustment: oItem.LabourMMAdjustment,
                AdjustedLabourMM: oItem.AdjustedLabourMM,
                LabourMMAdjFix: oItem.LabourMMAdjFix,
                LabourSellRate: oItem.LabourSellRate,
                STLabourPrice: oItem.STLabourPrice,
                STOverHead: oItem.STOverHead,
                STOverHeadPercent: oItem.STOverHeadPercent,
                AdjustedOverhead: oItem.AdjustedOverhead,
                STIndirectLabourVar: oItem.STIndirectLabourVar,
                IndirectLabourVarAdj: oItem.IndirectLabourVarAdj,
                AdjustedIndirectLabourVar: oItem.AdjustedIndirectLabourVar,
                STIndirectFixed: oItem.STIndirectFixed,
                IndirectFixedAdjustment: oItem.IndirectFixedAdjustment,
                AdjustedIndirectFix: oItem.AdjustedIndirectFix,
                OtherAdjustment: oItem.OtherAdjustment,
                STTotal: oItem.STTotal,
                SalesPriceFood: oItem.SalesPriceFood,
                SalesPriceLabour: oItem.SalesPriceLabour,
                SalesPriceOverhead: oItem.SalesPriceOverhead,
                SalesPriceIndirectLabour: oItem.SalesPriceIndirectLabour,
                SalesPriceIndirectFixed: oItem.SalesPriceIndirectFixed,
                TotalSellingPrice: oItem.TotalSellingPrice,
                FreeofCharge: oItem.FreeofCharge,
                GrossProfit: oItem.GrossProfit,
                GrossProfitPercent: oItem.GrossProfitPercent,
                NetMargin: oItem.NetMargin,
                NetMarginPercent: oItem.NetMarginPercent,
                QuotedPrice: oItem.QuotedPrice,
                IncrementPercent: oItem.IncrementPercent,
                ProposedNewPrice: oItem.ProposedNewPrice,
                PrecedingQT: oItem.PrecedingQT,
                Currency: oItem.Currency,
                ValidFrom: oItem.ValidFrom,
                ValidTo: oItem.ValidTo,
                DiffPrevQTPrice: oItem.DiffPrevQTPrice,
                PrevQT: oItem.PrevQT,
                PrevQTItem: oItem.PrevQTItem,
                PreQTPrice: oItem.PreQTPrice,
                PrevQTCost: oItem.PrevQTCost,
                Margin: oItem.Margin,
                MarginPercnt: oItem.MarginPercnt,
                PrevValidFrom: oItem.PrevValidFrom,
                PrevValidTo: oItem.PrevValidTo,
                Message: oItem.Message
            };
        },

        /**
         * Value-help handler for Contract No (ContractVh).
         * Dialog shows Contract + Contract Type; client-side search after load.
         */
        async onContractNoValueHelp() {
            const oView = this.getView();
            const oInput = this.byId("contractNoInput");
            if (!this._oContractVHDialog) {
                this._oContractVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("copyContractNoLabel"),
                    contentWidth: "28rem",
                    multiSelect: false,
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("copyContractNoLabel") }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("contractTypeLabel") }) })
                    ],
                    items: {
                        path: "contractVH>/items",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{contractVH>Contract}" }),
                                new sap.m.Text({ text: "{contractVH>ContractType}" })
                            ]
                        })
                    },
                    confirm: function (oEvent) {
                        const oSelectedItem = oEvent.getParameter("selectedItem");
                        if (!oSelectedItem || !oInput) {
                            return;
                        }
                        const oCtx = oSelectedItem.getBindingContext("contractVH");
                        const oData = oCtx ? oCtx.getObject() : null;
                        oInput.setValue((oData && oData.Contract) || oSelectedItem.getCells()[0].getText() || "");
                        if (oInput.setValueState) {
                            oInput.setValueState(ValueState.None);
                        }
                    },
                    search: function (oEvent) {
                        const sValue = String(oEvent.getParameter("value") || "").trim().toLowerCase();
                        const aAll = this._aContractVHAllItems || [];
                        const aFiltered = !sValue ? aAll : aAll.filter(function (oRow) {
                            return String(oRow.Contract || "").toLowerCase().indexOf(sValue) >= 0
                                || String(oRow.ContractType || "").toLowerCase().indexOf(sValue) >= 0;
                        });
                        this._oContractVHDialog.getModel("contractVH").setProperty("/items", aFiltered);
                    }.bind(this)
                });
                this._oContractVHDialog.setModel(new JSONModel({ items: [] }), "contractVH");
                oView.addDependent(this._oContractVHDialog);
            }

            this._openBusyDialog();
            try {
                const oModel = oView.getModel();
                const oListBinding = oModel.bindList("/ContractVh", undefined, undefined, undefined, {
                    $select: "Contract,ContractType,SalesOrg,DistChannel,Division,Customer",
                    $$ownRequest: true
                });
                const aContexts = await oListBinding.requestContexts(0, Infinity);
                const aItems = aContexts.map(function (oCtx) {
                    const o = oCtx.getObject() || {};
                    return {
                        Contract: o.Contract || "",
                        ContractType: o.ContractType || "",
                        SalesOrg: o.SalesOrg || "",
                        DistChannel: o.DistChannel || "",
                        Division: o.Division || "",
                        Customer: o.Customer || ""
                    };
                });
                this._aContractVHAllItems = aItems;
                this._oContractVHDialog.getModel("contractVH").setProperty("/items", aItems);
            } catch (oError) {
                MessageToast.show(this._extractErrorMessage(oError));
                this._aContractVHAllItems = [];
                this._oContractVHDialog.getModel("contractVH").setProperty("/items", []);
            } finally {
                this._closeBusyDialog();
            }
            this._oContractVHDialog.open();
        },

        /**
         * Material value help request handler.
         */
        onMaterialValueHelp() {
            const oInput = this.byId("qdAddMaterialInput");
            if (!this._oMaterialVHDialog) {
                this._oMaterialVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("qdColMaterial"),
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("qdColMaterial") }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("qdColDescription") }) })
                    ],
                    items: {
                        path: "/MaterialVH",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{Material}" }),
                                new sap.m.Text({ text: "{Material_Text}" })
                            ]
                        })
                    },
                    confirm: function (oEvent) {
                        var oItem = oEvent.getParameter("selectedItem");
                        if (oItem) {
                            oInput.setValue(oItem.getCells()[0].getText());
                        }
                    },
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var aFilters = [];
                        if (sValue) {
                            aFilters.push(new Filter({
                                filters: [
                                    new Filter("Material", FilterOperator.Contains, sValue),
                                    new Filter("Material_Text", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            }));
                        }
                        oEvent.getSource().getBinding("items").filter(aFilters);
                    }
                });
                this.getView().addDependent(this._oMaterialVHDialog);
            }
            this._oMaterialVHDialog.open();
        },


        /**
         * Handler for "Simulation" button.
         * Recalculates derived pricing fields for selected rows.
         */
        onQDSimulation() {
            const oUiModel = this._getUiModel();
            const oTable = this.byId("qdCurrentQuotationTable");
            const aSelectedIndices = oTable ? oTable.getSelectedIndices() : [];
            if (!aSelectedIndices.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }
            const fp = function (v) { return parseFloat(v) || 0; };

            aSelectedIndices.forEach((iIdx) => {
                const sPath = "/quotationDetail/items/" + iIdx;
                const o = oUiModel.getProperty(sPath);
                if (!o) { return; }

                var fYSFC = fp(o.YieldedStandardFoodCost);
                var fMarkUpPct = fp(o.MarkUpPercent);
                o.STMarkUp = String((fYSFC * (1 + fMarkUpPct / 100)).toFixed(2));

                var fSTLabourMM = fp(o.STLabourMM);
                var fLabourCostRate = fp(o.LabourCostRate);
                o.LabourCost = String((fSTLabourMM * fLabourCostRate).toFixed(2));

                var fLabourMMAdjPct = fp(o.LabourMMAdjustment);
                o.AdjustedLabourMM = String((fSTLabourMM * (1 + fLabourMMAdjPct / 100)).toFixed(2));

                var fAdjLabourMM = fp(o.AdjustedLabourMM);
                var fLabourMMAdjFix = fp(o.LabourMMAdjFix);
                var fLabourSellRate = fp(o.LabourSellRate);
                o.STLabourPrice = String(((fAdjLabourMM + fLabourMMAdjFix) * fLabourSellRate).toFixed(2));

                var fSTOverHead = fp(o.STOverHead);
                var fOHPct = fp(o.STOverHeadPercent);
                o.AdjustedOverhead = String((fSTOverHead * (1 + fOHPct / 100)).toFixed(2));

                var fSTILV = fp(o.STIndirectLabourVar);
                var fILVPct = fp(o.IndirectLabourVarAdj);
                o.AdjustedIndirectLabourVar = String((fSTILV * (1 + fILVPct / 100)).toFixed(2));

                var fSTIF = fp(o.STIndirectFixed);
                var fIFPct = fp(o.IndirectFixedAdjustment);
                o.AdjustedIndirectFix = String((fSTIF * (1 + fIFPct / 100)).toFixed(2));

                var fOtherAdj = fp(o.OtherAdjustment);
                o.STTotal = String((fp(o.STMarkUp) + fp(o.STLabourPrice) + fp(o.AdjustedOverhead) +
                    fp(o.AdjustedIndirectLabourVar) + fp(o.AdjustedIndirectFix) + fOtherAdj).toFixed(2));

                var fTotalSell = fp(o.SalesPriceFood) + fp(o.SalesPriceLabour) + fp(o.SalesPriceOverhead) +
                    fp(o.SalesPriceIndirectLabour) + fp(o.SalesPriceIndirectFixed);
                o.TotalSellingPrice = String(fTotalSell.toFixed(2));

                var fSTTotal = fp(o.STTotal);
                o.GrossProfit = String((fTotalSell - fSTTotal).toFixed(2));

                o.GrossProfitPercent = fTotalSell !== 0
                    ? String(((fTotalSell - fSTTotal) / fTotalSell * 100).toFixed(2))
                    : "0.00";

                var fQuotedPrice = fp(o.QuotedPrice);
                var fIncrPct = fp(o.IncrementPercent);
                o.ProposedNewPrice = String((fQuotedPrice * (1 + fIncrPct / 100)).toFixed(2));

                oUiModel.setProperty(sPath, o);
            });

            oUiModel.refresh(true);
            MessageToast.show(this._getText("msgSimulationDone", [String(aSelectedIndices.length)]));
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
                name: "com.cathaydining.zsde005.copyquo.view.fragments.BomTreeView",
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