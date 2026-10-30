sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (ControllerExtension, JSONModel, Fragment, Dialog, Button, MessageToast, MessageBox, BusyIndicator, Filter, FilterOperator) {
    "use strict";

    return ControllerExtension.extend("com.cathaydining.zsde005.createquo.ext.controller.ListReportExtension", {
        override: {
            onInit: function () {
                const oUiModel = new JSONModel({
                    newQuotation: {
                        contractNo: "",
                        headerDesc: "",
                        salesOrg: "",
                        distChannel: "",
                        division: "",
                        customer: "",
                        airline: "",
                        qtType: "",
                        effectiveFrom: null,
                        effectiveTo: null,
                        roundUp: false,
                        grossProfitMode: false,
                        selectedMaterialRows: []
                    },
                    quotationDetail: {
                        Title: "New Object",
                        addMaterial: "",
                        labourMMAdjValue: null,
                        labourSellRate: null,
                        items: []
                    }
                });
                this.getView().setModel(oUiModel, "ui");
            },
        },

        onMaterialNewQuotation: async function () {
            var oExtensionAPI = this.base.getExtensionAPI();
            var aSelectedContexts = oExtensionAPI.getSelectedContexts();

            if (!aSelectedContexts.length) { return; }

            // Read filter bar conditions (mandatory fields entered by user)
            var oFilterBar = this.base.getView().byId("com.cathaydining.zsde005.createquo::ZI_SD_QT_MATERIALList--fe::FilterBar::ZI_SD_QT_MATERIAL");
            var mConditions = oFilterBar ? oFilterBar.getConditions() : {};
            function getFilterValue(sField) {
                var aCond = mConditions[sField];
                if (!aCond || !aCond.length) { return ""; }
                var vVal = aCond[0].values[0];
                if (vVal === null || vVal === undefined) { return ""; }
                // MDC value-help fields store { key, description }; plain fields store a primitive
                return typeof vVal === "object" ? (vVal.key || "") : String(vVal);
            }
            var sSalesOrg = getFilterValue("SalesOrg");
            var sDistChannel = getFilterValue("DistChannel");
            var sDivision = getFilterValue("Division");
            var sCustomer = getFilterValue("Customer");
            var aMaterials = aSelectedContexts.map((c) => (c.getObject() || {}).Material).filter(Boolean);

            BusyIndicator.show(0);
            try {
                var oModel = this.base.getView().getModel();

                // Build filter: (Material eq 'A' or 'B') and SalesOrg and DistChannel and Division and Customer
                var aMaterialFilters = aMaterials.map((m) => new Filter("Material", FilterOperator.EQ, m));
                var oMaterialFilter = aMaterialFilters.length > 1
                    ? new Filter({ filters: aMaterialFilters, and: false })
                    : aMaterialFilters[0];

                var aAndFilters = [
                    new Filter("SalesOrg", FilterOperator.EQ, sSalesOrg),
                    new Filter("DistChannel", FilterOperator.EQ, sDistChannel),
                    oMaterialFilter
                ];
                if (sDivision) {
                    aAndFilters.splice(2, 0, new Filter("Division", FilterOperator.EQ, sDivision));
                }
                if (sCustomer) {
                    aAndFilters.splice(2, 0, new Filter("Customer", FilterOperator.EQ, sCustomer));
                }

                var oListBinding = oModel.bindList("/ZI_SD_QT_MATERIAL", undefined, undefined, undefined, {
                    $select: "Material,Description,SalesOrg,DistChannel,Division,MaterialType,MaterialStatus,CabinClass,BomStatus,BomEffectiveDate,CP,NewCost,Customer,AirlineCode,CostRunDate",
                    $$ownRequest: true
                });
                oListBinding.filter(new Filter({ filters: aAndFilters, and: true }));

                var aContexts = await oListBinding.requestContexts(0, Infinity);
                var aFetchedData = aContexts.map((c) => c.getObject() || {});
                var aRows = aFetchedData.map((oData) => ({
                    Material: oData.Material,
                    Description: oData.Description,
                    SalesOrg: oData.SalesOrg,
                    DistChannel: oData.DistChannel,
                    Division: oData.Division,
                    MaterialType: oData.MaterialType,
                    MaterialStatus: oData.MaterialStatus,
                    CabinClass: oData.CabinClass,
                    BomStatus: oData.BomStatus,
                    BomEffectiveDate: oData.BomEffectiveDate,
                    CP: oData.CP,
                    NewCost: oData.NewCost,
                    Customer: oData.Customer,
                    AirlineCode: oData.AirlineCode,
                    CostRunDate: oData.CostRunDate
                }));

                if (!aRows.length) {
                    MessageToast.show(this._getText("msgNoDataSelected"));
                    return;
                }
                this._getUiModel().setProperty("/newQuotation", {
                    contractNo: "",
                    headerDesc: "",
                    salesOrg: aRows[0].SalesOrg,
                    distChannel: aRows[0].DistChannel,
                    division: aRows[0].Division,
                    customer: aRows[0].Customer,
                    airline: aRows[0].AirlineCode,
                    qtType: "",
                    effectiveFrom: null,
                    effectiveTo: null,
                    roundUp: false,
                    grossProfitMode: false,
                    selectedMaterialRows: aRows
                });

                var oDialog = await this._getNewQuotationDialog();
                this._oActiveNewQuoDialog = oDialog;
                this._sActiveNewQuoFlow = "material";
                oDialog.open();
            } catch (oError) {
                MessageBox.error(this._getText("msgMaterialFetchFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Lazily loads the shared NewQuotation fragment into a Dialog and caches it.
         * Used by both Material and Loading Template create-quotation flows.
         * The Dialog is added as a dependent of the view so it inherits the
         * "ui" and "i18n" models.
         * @returns {Promise<sap.m.Dialog>} The dialog instance
         * @private
         */
        _getNewQuotationDialog: function () {
            var oView = this.base.getView();
            if (!this._pNewQuotationDialog) {
                this._pNewQuotationDialog = Fragment.load({
                    name: "com.cathaydining.zsde005.createquo.ext.fragments.NewQuotation",
                    controller: this
                }).then(function (oContent) {
                    // Store DatePicker references for validation
                    var aAll = oContent.findAggregatedObjects(true);
                    this._oNQEffectiveFrom = aAll.find(function (c) {
                        return c.isA("sap.m.DatePicker") && c.getBindingPath("value") === "/newQuotation/effectiveFrom";
                    });
                    this._oNQEffectiveTo = aAll.find(function (c) {
                        return c.isA("sap.m.DatePicker") && c.getBindingPath("value") === "/newQuotation/effectiveTo";
                    });
                    var oDialog = new Dialog({
                        title: "{i18n>newQuotationSectionTitle}",
                        stretch: true,
                        resizable: true,
                        draggable: true,
                        content: [oContent],
                        beginButton: new Button({
                            text: "{i18n>nextButton}",
                            type: "Emphasized",
                            press: function () {
                                this.onNextModifyPricingWorkbench();
                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: "{i18n>qdClose}",
                            press: function () {
                                oDialog.close();
                            }
                        })
                    });
                    oView.addDependent(oDialog);
                    this._setupDialogFullScreenToggle(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pNewQuotationDialog;
        },

        onLoadingTemplateNewQuotation: async function () {
            var oExtensionAPI = this.base.getExtensionAPI();
            var aSelectedContexts = oExtensionAPI.getSelectedContexts();
            if (!aSelectedContexts || !aSelectedContexts.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            if (this._bLoadingTemplateBusy) {
                return;
            }
            this._bLoadingTemplateBusy = true;
            BusyIndicator.show(0);
            try {
                var oModel = this.base.getView().getModel();
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetMaterial(...)");
                oActionBinding.setParameter("Type", "");
                oActionBinding.setParameter("Message", "");
                var aSelectedTempHeaders = await Promise.all(aSelectedContexts.map(async (oContext) => {
                    var aValues = await oContext.requestProperty([
                        "LoadingTempCode",
                        "LoadingTempKey",
                        "CabinClass",
                        "AircraftType",
                        "Customer",
                        "SalesOrg",
                        "DistributionChannel",
                        "Division",
                        "AirlineCode"
                    ]);
                    return {
                        LoadingTempCode: aValues[0] || "",
                        LoadingTempKey: aValues[1] || null,
                        CabinClass: aValues[2] || "",
                        AircraftType: aValues[3] || "",
                        Customer: aValues[4] || "",
                        SalesOrg: aValues[5] || "",
                        DistributionChannel: aValues[6] || "",
                        Division: aValues[7] || "",
                        AirlineCode: aValues[8] || ""
                    };
                }));
                // GetMaterial _loadTemp (ZA_SD_LDGTEMP_HDR) only accepts these five fields
                oActionBinding.setParameter("_loadTemp", aSelectedTempHeaders.map(function (oHeader) {
                    return {
                        LoadingTempCode: oHeader.LoadingTempCode,
                        LoadingTempKey: oHeader.LoadingTempKey,
                        CabinClass: oHeader.CabinClass,
                        AircraftType: oHeader.AircraftType,
                        Customer: oHeader.Customer,
                        AirlineCode: oHeader.AirlineCode
                    };
                }));

                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aRootResults = this._normalizeActionResultArray(vActionResult);

                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    MessageToast.show(sBusinessError);
                    return;
                }

                var oHeaderFromTemp = aSelectedTempHeaders[0] || {};
                var aRows = [];
                aRootResults.forEach((oRoot) => {
                    var aMaterial = (oRoot && oRoot._material) || [];
                    aMaterial.forEach((oMat) => {
                        aRows.push({
                            Material: oMat.Material,
                            Description: oMat.Description,
                            SalesOrg: oMat.SalesOrg || oHeaderFromTemp.SalesOrg || "",
                            DistChannel: oMat.DistChannel || oHeaderFromTemp.DistributionChannel || "",
                            Division: oMat.Division || oHeaderFromTemp.Division || "",
                            MaterialType: oMat.MaterialType,
                            MaterialStatus: oMat.MaterialStatus,
                            CabinClass: oMat.CabinClass,
                            BomStatus: oMat.BomStatus,
                            BomEffectiveDate: oMat.BomEffectiveDate,
                            CP: oMat.CP,
                            NewCost: oMat.NewCost,
                            Customer: oMat.Customer || oHeaderFromTemp.Customer || "",
                            AirlineCode: oMat.AirlineCode || oHeaderFromTemp.AirlineCode || "",
                            CostRunDate: oMat.CostRunDate,
                            LoadingTemplateKey: oMat.LoadingTemplateKey,
                            LoadingTemplateCode: oMat.LoadingTemplateCode,
                            MealType: oMat.MealType,
                            Sequnce: oMat.Sequnce
                        });
                    });
                });
                var oFirstRow = aRows[0] || {};
                this._getUiModel().setProperty("/newQuotation", {
                    contractNo: "",
                    headerDesc: "",
                    salesOrg: oHeaderFromTemp.SalesOrg || oFirstRow.SalesOrg || "",
                    distChannel: oHeaderFromTemp.DistributionChannel || oFirstRow.DistChannel || "",
                    division: oHeaderFromTemp.Division || oFirstRow.Division || "",
                    customer: oHeaderFromTemp.Customer || "",
                    airline: oHeaderFromTemp.AirlineCode || oFirstRow.AirlineCode || "",
                    qtType: "",
                    effectiveFrom: null,
                    effectiveTo: null,
                    roundUp: false,
                    grossProfitMode: false,
                    selectedMaterialRows: aRows
                });

                var oDialog = await this._getNewQuotationDialog();
                this._oActiveNewQuoDialog = oDialog;
                this._sActiveNewQuoFlow = "loadingTemplate";
                oDialog.open();
            } catch (oError) {
                MessageToast.show(this._extractErrorMessage(oError));
            } finally {
                BusyIndicator.hide();
                this._bLoadingTemplateBusy = false;
            }
        },

        /**
         * Validates the required Effective From / Effective To fields on the Material Display dialog
         * and highlights the corresponding DatePicker controls when invalid.
         * @param {object} oForm Header form data from the "ui" model /newQuotation node
         * @returns {boolean} true if valid, false otherwise
         * @private
         */
        _validateMaterialNewQuoRequiredFields: function (oForm) {
            var oEffectiveFromPicker = this._oNQEffectiveFrom;
            var oEffectiveToPicker = this._oNQEffectiveTo;
            var bValid = true;

            var bEffectiveFromInPast = false;
            var bEffectiveToBeforeFrom = false;
            if (oEffectiveFromPicker) {
                if (!oForm.effectiveFrom) {
                    oEffectiveFromPicker.setValueState("Error");
                    oEffectiveFromPicker.setValueStateText(this._getText("msgFieldRequired"));
                    bValid = false;
                } else if (this._toCalendarTime(oForm.effectiveFrom) < this._getTodayCalendarTime()) {
                    oEffectiveFromPicker.setValueState("Error");
                    oEffectiveFromPicker.setValueStateText(this._getText("msgEffectiveFromNotBeforeToday"));
                    bValid = false;
                    bEffectiveFromInPast = true;
                } else {
                    oEffectiveFromPicker.setValueState("None");
                }
            }

            if (oEffectiveToPicker) {
                if (!oForm.effectiveTo) {
                    oEffectiveToPicker.setValueState("Error");
                    oEffectiveToPicker.setValueStateText(this._getText("msgFieldRequired"));
                    bValid = false;
                } else {
                    var iEffectiveFrom = this._toCalendarTime(oForm.effectiveFrom);
                    var iEffectiveTo = this._toCalendarTime(oForm.effectiveTo);
                    if (iEffectiveFrom !== null && iEffectiveTo !== null && iEffectiveTo < iEffectiveFrom) {
                        oEffectiveToPicker.setValueState("Error");
                        oEffectiveToPicker.setValueStateText(this._getText("msgEffectiveToBeforeFrom"));
                        bValid = false;
                        bEffectiveToBeforeFrom = true;
                    } else {
                        oEffectiveToPicker.setValueState("None");
                    }
                }
            }

            if (!bValid) {
                var sToastKey = "msgEffectiveDatesRequired";
                if (bEffectiveFromInPast) {
                    sToastKey = "msgEffectiveFromNotBeforeToday";
                } else if (bEffectiveToBeforeFrom) {
                    sToastKey = "msgEffectiveToBeforeFrom";
                }
                MessageToast.show(this._getText(sToastKey));
            }

            return bValid;
        },

        /**
         * Normalizes a Date object or "yyyy-MM-dd" / "yyyy/MM/dd" string into a comparable
         * calendar-day timestamp (UTC midnight), so that time and time zone are irrelevant.
         * @param {Date|string|null} vValue Source date value
         * @returns {number|null} UTC timestamp of the calendar day, or null when not parsable
         * @private
         */
        _toCalendarTime: function (vValue) {
            if (!vValue) {
                return null;
            }
            if (vValue instanceof Date) {
                if (Number.isNaN(vValue.getTime())) {
                    return null;
                }
                // DatePicker values bound with UTC:true carry UTC midnight; otherwise use local parts
                if (vValue.getUTCHours() === 0 && vValue.getUTCMinutes() === 0 && vValue.getUTCSeconds() === 0) {
                    return Date.UTC(vValue.getUTCFullYear(), vValue.getUTCMonth(), vValue.getUTCDate());
                }
                return Date.UTC(vValue.getFullYear(), vValue.getMonth(), vValue.getDate());
            }
            var aParts = String(vValue).substring(0, 10).split(/[-/.]/);
            if (aParts.length !== 3) {
                return null;
            }
            var iYear = parseInt(aParts[0], 10);
            var iMonth = parseInt(aParts[1], 10);
            var iDay = parseInt(aParts[2], 10);
            if (Number.isNaN(iYear) || Number.isNaN(iMonth) || Number.isNaN(iDay)) {
                return null;
            }
            return Date.UTC(iYear, iMonth - 1, iDay);
        },

        /**
         * Returns today's calendar day as a comparable UTC timestamp.
         * @returns {number} UTC timestamp of today
         * @private
         */
        _getTodayCalendarTime: function () {
            var oNow = new Date();
            return Date.UTC(oNow.getFullYear(), oNow.getMonth(), oNow.getDate());
        },

        /**
         * Formats a calendar timestamp / date value as yyyy/MM/dd for messages.
         * @param {Date|string|number|null} vValue Source value
         * @returns {string} Formatted date or empty string
         * @private
         */
        _formatCalendarDateText: function (vValue) {
            var iTime = typeof vValue === "number" ? vValue : this._toCalendarTime(vValue);
            if (iTime === null || iTime === undefined) {
                return "";
            }
            var oDate = new Date(iTime);
            return oDate.getUTCFullYear()
                + "/" + String(oDate.getUTCMonth() + 1).padStart(2, "0")
                + "/" + String(oDate.getUTCDate()).padStart(2, "0");
        },

        /**
         * Validates that every row's Prev. Valid From / Prev. Valid To fall inside the header
         * Effective From - Effective To range, and that From is not after To.
         * @param {object[]} aItems Current Quotation rows
         * @param {object} oForm Header form data from the "ui" model /newQuotation node
         * @returns {string[]} List of error messages (empty when valid)
         * @private
         */
        _validateQDPrevValidDates: function (aItems, oForm) {
            var aErrors = [];
            var iFrom = this._toCalendarTime(oForm.effectiveFrom);
            var iTo = this._toCalendarTime(oForm.effectiveTo);
            if (iFrom === null || iTo === null) {
                return aErrors;
            }
            var sRangeFrom = this._formatCalendarDateText(iFrom);
            var sRangeTo = this._formatCalendarDateText(iTo);

            aItems.forEach(function (oItem, iIndex) {
                var sRowId = oItem.Material || oItem.Item || String(iIndex + 1);
                var iPrevFrom = this._toCalendarTime(oItem.PrevValidFrom);
                var iPrevTo = this._toCalendarTime(oItem.PrevValidTo);

                if ((iPrevFrom !== null && (iPrevFrom < iFrom || iPrevFrom > iTo))
                    || (iPrevTo !== null && (iPrevTo < iFrom || iPrevTo > iTo))) {
                    aErrors.push(this._getText("msgPrevValidDatesOutOfRange", [sRowId, sRangeFrom, sRangeTo]));
                    return;
                }
                if (iPrevFrom !== null && iPrevTo !== null && iPrevFrom > iPrevTo) {
                    aErrors.push(this._getText("msgPrevValidFromAfterTo", [sRowId]));
                }
            }.bind(this));

            return aErrors;
        },

        /**
         * Validates that every row's Valid From / Valid To fall inside the header
         * Effective From - Effective To range, and that From is not after To.
         * Failing rows get their Message/Type fields set (Type "E") so the error
         * shows in the table's System Msg column; messages previously set by this
         * validation are cleared first.
         * @param {object[]} aItems Current Quotation rows
         * @param {object} oForm Header form data from the "ui" model /newQuotation node
         * @returns {string[]} List of error messages (empty when valid)
         * @private
         */
        _validateQDValidDates: function (aItems, oForm) {
            var aErrors = [];
            var iFrom = this._toCalendarTime(oForm.effectiveFrom);
            var iTo = this._toCalendarTime(oForm.effectiveTo);
            var sRangeFrom = this._formatCalendarDateText(iFrom);
            var sRangeTo = this._formatCalendarDateText(iTo);

            aItems.forEach(function (oItem) {
                // Clear only messages previously set by this validation
                if (oItem._dateValidationError) {
                    oItem.Message = "";
                    oItem.Type = "";
                    oItem._dateValidationError = false;
                }
                if (iFrom === null || iTo === null) {
                    return;
                }
                var iValidFrom = this._toCalendarTime(oItem.ValidFrom);
                var iValidTo = this._toCalendarTime(oItem.ValidTo);
                var sError = "";

                if ((iValidFrom !== null && (iValidFrom < iFrom || iValidFrom > iTo))
                    || (iValidTo !== null && (iValidTo < iFrom || iValidTo > iTo))) {
                    sError = this._getText("msgRowValidDatesOutOfRange", [sRangeFrom, sRangeTo]);
                } else if (iValidFrom !== null && iValidTo !== null && iValidFrom > iValidTo) {
                    sError = this._getText("msgRowValidFromAfterTo");
                }

                if (sError) {
                    oItem.Message = sError;
                    oItem.Type = "E";
                    oItem._dateValidationError = true;
                    aErrors.push(sError);
                }
            }.bind(this));

            return aErrors;
        },

        onNextModifyPricingWorkbench: async function () {
            var oUiModel = this._getUiModel();
            var oForm = oUiModel.getProperty("/newQuotation") || {};
            var aMaterialRows = oForm.selectedMaterialRows;

            if (!this._validateMaterialNewQuoRequiredFields(oForm)) {
                return;
            }

            if (this._bPricingWorkbenchBusy) {
                return;
            }
            this._bPricingWorkbenchBusy = true;
            BusyIndicator.show(0);
            try {
                var oModel = this.base.getView().getModel();
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetQuotation(...)");
                oActionBinding.setParameter("ContractNo", oForm.contractNo || "");
                oActionBinding.setParameter("GrossProfitMode", !!oForm.grossProfitMode);
                oActionBinding.setParameter("RoundUp", !!oForm.roundUp);
                oActionBinding.setParameter("SalesOrg", oForm.salesOrg || "");
                oActionBinding.setParameter("DistChannel", oForm.distChannel || "");
                oActionBinding.setParameter("Division", oForm.division || "");
                oActionBinding.setParameter("Customer", oForm.customer || "");
                oActionBinding.setParameter("EffectiveFrom", this._toEdmDateValue(oForm.effectiveFrom));
                oActionBinding.setParameter("EffectiveTo", this._toEdmDateValue(oForm.effectiveTo));
                oActionBinding.setParameter("AirlineCode", oForm.airline || "");
                oActionBinding.setParameter("_materialList", aMaterialRows.map((oRow) => ({
                    Material: oRow.Material || "",
                    MaterialType: oRow.MaterialType || "",
                    MaterialStatus: oRow.MaterialStatus || "",
                    CabinClass: oRow.CabinClass || "",
                    BomStatus: oRow.BomStatus || "",
                    Description: oRow.Description || "",
                    AirlineCode: oRow.AirlineCode || "",
                    LoadingTempKey: oRow.LoadingTemplateKey || "",
                    LoadingTempCode: oRow.LoadingTemplateCode || "",
                    MealType: oRow.MealType || "",
                    Sequence: oRow.Sequence || ""
                })));

                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aRootResults = this._normalizeActionResultArray(vActionResult);

                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    MessageToast.show(this._getText("msgMaterialQuotationFailed", [sBusinessError]));
                    return;
                }

                var oRootResult = aRootResults[0] || {};
                var aItems = (oRootResult._quotation || []).map((oItem) => Object.assign({}, oItem));

                if (this._oActiveNewQuoDialog) {
                    this._oActiveNewQuoDialog.close();
                }

                var oDialog = await this._getQuotationDetailDialog();
                oUiModel.setProperty("/quotationDetail/items", aItems);
                oUiModel.setProperty("/newQuotation/qtType", oRootResult.QTType || (aItems[0] && aItems[0].QTType) || "");
                // Reset dialog title back to default and re-enable Save button
                oUiModel.setProperty("/quotationDetail/Title", this._getText("qdTitle"));
                oDialog.getBeginButton().setEnabled(true);
                var oQDContent = oDialog.getContent()[0];
                if (oQDContent) {
                    oQDContent.findAggregatedObjects(true).forEach(function (c) {
                        if (c.isA("sap.m.Button")) { c.setEnabled(true); }
                    });
                }
                oDialog.open();
            } catch (oError) {
                MessageToast.show(this._getText("msgMaterialQuotationFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
                this._bPricingWorkbenchBusy = false;
            }
        },

        /**
         * Lazily loads the QuotationDetail fragment into a Dialog and caches it.
         * @returns {Promise<sap.m.Dialog>} The dialog instance
         * @private
         */
        _getQuotationDetailDialog: function () {
            var oView = this.base.getView();
            if (!this._pQuotationDetailDialog) {
                this._pQuotationDetailDialog = Fragment.load({
                    id: oView.createId("quotationDetail"),
                    name: "com.cathaydining.zsde005.createquo.ext.fragments.QuotationDetail",
                    controller: this
                }).then(function (oContent) {
                    var oTable = oView.byId("quotationDetail--qdCurrentQuotationTable");
                    if (oTable) {
                        oTable.attachRowsUpdated(function () {
                            var oTableDomRef = oTable.getDomRef();
                            if (!oTableDomRef) { return; }
                            oTable.getRows().forEach(function (oRow) {
                                var oCtx = oRow.getBindingContext("ui");
                                var oPrimaryDomRef = oRow.getDomRef();
                                if (!oPrimaryDomRef) { return; }
                                var sRowIndex = oPrimaryDomRef.getAttribute("data-sap-ui-rowindex");
                                if (sRowIndex === null) { return; }
                                // fixedColumnCount splits each logical row into multiple synced
                                // <tr> elements (row-selector / fixed columns / scrollable columns
                                // areas). All of them share the same data-sap-ui-rowindex attribute.
                                var aRowParts = oTableDomRef.querySelectorAll("[data-sap-ui-rowindex=\"" + sRowIndex + "\"]");
                                var bHighlight = !!oCtx && String(oCtx.getProperty("ComponentID")) === "0";
                                aRowParts.forEach(function (oPart) {
                                    oPart.classList.toggle("cdQDHighlightRow", bHighlight);
                                });
                            });
                        });
                    }
                    var oDialog = new Dialog({
                        title: "{ui>/quotationDetail/Title}",
                        stretch: true,
                        resizable: true,
                        draggable: true,
                        content: [oContent],
                        beginButton: new Button({
                            text: "{i18n>qdSaveQuotation}",
                            type: "Emphasized",
                            press: this.onQDSaveQuotation.bind(this)
                        }),
                        endButton: new Button({
                            text: "{i18n>qdClose}",
                            press: function () {
                                oDialog.close();
                            }
                        })
                    });
                    oView.addDependent(oDialog);
                    this._setupDialogFullScreenToggle(oDialog);
                    this._oQuotationDetailDialog = oDialog;
                    return oDialog;
                }.bind(this));
            }
            return this._pQuotationDetailDialog;
        },

        /**
 * Converts Date/string value to Edm.Date format yyyy-MM-dd.
 *
 * @param {Date|string|null} vValue Source date value
 * @returns {string|null} Edm.Date value
 * @private
 */
        _toEdmDateValue(vValue) {
            if (!vValue) {
                return null;
            }

            if (typeof vValue === "string") {
                return vValue;
            }

            if (vValue instanceof Date && !Number.isNaN(vValue.getTime())) {
                const sYear = String(vValue.getFullYear()).padStart(4, "0");
                const sMonth = String(vValue.getMonth() + 1).padStart(2, "0");
                const sDate = String(vValue.getDate()).padStart(2, "0");
                return `${sYear}-${sMonth}-${sDate}`;
            }

            return String(vValue);
        },

        /**
         * Value-help handler for Contract No (ContractVh).
         * Loads data filtered by ui>/newQuotation Sales Org / Dist. Channel / Division / Customer.
         * Dialog only shows Contract + Contract Type (filter fields are not displayed).
         */
        onContractNoValueHelp: async function () {
            var oView = this.base.getView();
            var oUiModel = this._getUiModel();
            if (!this._oContractVHDialog) {
                this._oContractVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("contractNoLabel"),
                    contentWidth: "28rem",
                    multiSelect: false,
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("contractNoLabel") }) }),
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
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (!oSelectedItem) {
                            return;
                        }
                        var oCtx = oSelectedItem.getBindingContext("contractVH");
                        var oData = oCtx ? oCtx.getObject() : null;
                        oUiModel.setProperty("/newQuotation/contractNo",
                            (oData && oData.Contract) || oSelectedItem.getCells()[0].getText() || "");
                    },
                    search: function (oEvent) {
                        var sValue = String(oEvent.getParameter("value") || "").trim().toLowerCase();
                        var aAll = this._aContractVHAllItems || [];
                        var aFiltered = !sValue ? aAll : aAll.filter(function (oRow) {
                            return String(oRow.Contract || "").toLowerCase().indexOf(sValue) >= 0
                                || String(oRow.ContractType || "").toLowerCase().indexOf(sValue) >= 0;
                        });
                        this._oContractVHDialog.getModel("contractVH").setProperty("/items", aFiltered);
                    }.bind(this)
                });
                this._oContractVHDialog.setModel(new JSONModel({ items: [] }), "contractVH");
                oView.addDependent(this._oContractVHDialog);
            }

            BusyIndicator.show(0);
            try {
                var aContextFilters = this._buildContractVhContextFilters();
                if (!aContextFilters.length) {
                    MessageToast.show(this._getText("msgContractVhMissingContext"));
                    this._aContractVHAllItems = [];
                    this._oContractVHDialog.getModel("contractVH").setProperty("/items", []);
                    this._oContractVHDialog.open();
                    return;
                }

                var oModel = oView.getModel();
                var oListBinding = oModel.bindList("/ContractVh", undefined, undefined, aContextFilters, {
                    $select: "Contract,ContractType,SalesOrg,DistChannel,Division,Customer",
                    $$ownRequest: true
                });
                var aContexts = await oListBinding.requestContexts(0, Infinity);
                var aItems = aContexts.map(function (oCtx) {
                    var o = oCtx.getObject() || {};
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
                BusyIndicator.hide();
            }
            this._oContractVHDialog.open();
        },

        /**
         * Builds ContractVh EQ filters from ui>/newQuotation header context.
         * Sales Org, Dist. Channel, Division, Customer are filter-only (not shown in dialog).
         * @returns {sap.ui.model.Filter[]}
         * @private
         */
        _buildContractVhContextFilters: function () {
            var oForm = this._getUiModel().getProperty("/newQuotation") || {};
            var aFilters = [];
            if (oForm.salesOrg) {
                aFilters.push(new Filter("SalesOrg", FilterOperator.EQ, String(oForm.salesOrg).trim()));
            }
            if (oForm.distChannel) {
                aFilters.push(new Filter("DistChannel", FilterOperator.EQ, String(oForm.distChannel).trim()));
            }
            if (oForm.division) {
                aFilters.push(new Filter("Division", FilterOperator.EQ, String(oForm.division).trim()));
            }
            if (oForm.customer) {
                aFilters.push(new Filter("Customer", FilterOperator.EQ, String(oForm.customer).trim()));
            }
            return aFilters;
        },

        onMaterialValueHelp: function () {
            var oView = this.base.getView();
            var oInput = oView.byId("quotationDetail--qdAddMaterialInput");
            if (!this._oMaterialVHDialog) {
                this._oMaterialVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("qdAddMaterial"),
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("colMaterial") }) }),
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
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            oInput.setValue(oSelectedItem.getCells()[0].getText());
                        }
                    },
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var aFilters = [];
                        if (sValue) {
                            aFilters.push(new sap.ui.model.Filter({
                                filters: [
                                    new sap.ui.model.Filter("Material", sap.ui.model.FilterOperator.Contains, sValue),
                                    new sap.ui.model.Filter("Material_Text", sap.ui.model.FilterOperator.Contains, sValue)
                                ],
                                and: false
                            }));
                        }
                        oEvent.getSource().getBinding("items").filter(aFilters);
                    }
                });
                oView.addDependent(this._oMaterialVHDialog);
                this._oMaterialVHDialog.setModel(oView.getModel());
            }
            this._oMaterialVHDialog.open();
        },

        /**
         * Derives the F4 value-help service base URL from the main OData V4 service URL.
         * @returns {string} Base URL up to (but not including) "srvd/"
         * @private
         */
        _getF4BaseUrl: function () {
            var sMainUrl = this.base.getView().getModel().getServiceUrl();
            return sMainUrl.replace(/srvd\/.*$/, "");
        },

        /**
         * Fetches value-help data from an F4 service entity set.
         * @param {string} sF4ServicePath  F4 service path, e.g. "srvd_f4/sap/i_acmtrdgcontrsalesorgvh/0001"
         * @param {string} sEntitySet      Entity set name
         * @param {{field:string,value:string}[]} [aFilters] Optional EQ filters
         * @returns {Promise<object[]>} Array of entity objects
         * @private
         */
        _fetchF4Data: async function (sF4ServicePath, sEntitySet, aFilters) {
            var sBaseUrl = this._getF4BaseUrl();
            var sUrl = sBaseUrl + sF4ServicePath + "/" + sEntitySet;
            var aParams = [];
            if (aFilters && aFilters.length) {
                var aFilterParts = aFilters.map(function (oF) {
                    return oF.field + " eq '" + encodeURIComponent(oF.value) + "'";
                });
                aParams.push("$filter=" + aFilterParts.join(" and "));
            }
            if (aParams.length) {
                sUrl += "?" + aParams.join("&");
            }
            var oResponse = await fetch(sUrl, {
                headers: { "Accept": "application/json" }
            });
            if (!oResponse.ok) {
                throw new Error("HTTP " + oResponse.status);
            }
            var oData = await oResponse.json();
            return oData.value || [];
        },

        /**
         * Value-help handler for Sales Organization (I_ACMTrdgContrSalesOrgVH).
         */
        onSalesOrgValueHelp: async function () {
            var oView = this.base.getView();
            var oUiModel = this._getUiModel();
            if (!this._oSalesOrgVHDialog) {
                this._oSalesOrgVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("salesOrgLabel"),
                    contentWidth: "30rem",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("salesOrgLabel") }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("colDescription") }) })
                    ],
                    items: {
                        path: "salesOrgVH>/items",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{salesOrgVH>SalesOrganization}" }),
                                new sap.m.Text({ text: "{salesOrgVH>SalesOrganizationName}" })
                            ]
                        })
                    },
                    confirm: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            oUiModel.setProperty("/newQuotation/salesOrg", oSelectedItem.getCells()[0].getText());
                        }
                    },
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var aFilters = [];
                        if (sValue) {
                            aFilters.push(new Filter({
                                filters: [
                                    new Filter("SalesOrganization", FilterOperator.Contains, sValue),
                                    new Filter("SalesOrganizationName", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            }));
                        }
                        oEvent.getSource().getBinding("items").filter(aFilters);
                    }
                });
                this._oSalesOrgVHDialog.setModel(new JSONModel({ items: [] }), "salesOrgVH");
                oView.addDependent(this._oSalesOrgVHDialog);
            }
            BusyIndicator.show(0);
            try {
                var aData = await this._fetchF4Data(
                    "srvd_f4/sap/i_acmtrdgcontrsalesorgvh/0001;ps='srvd-zsd_sd_qt_load_temp-0001';va='com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.et-zi_sd_qt_material.salesorg'",
                    "I_ACMTrdgContrSalesOrgVH"
                );
                this._oSalesOrgVHDialog.getModel("salesOrgVH").setProperty("/items", aData);
            } catch (e) {
                MessageToast.show(this._extractErrorMessage(e));
            } finally {
                BusyIndicator.hide();
            }
            this._oSalesOrgVHDialog.open();
        },

        /**
         * Value-help handler for Distribution Channel (I_CmmdtyDistributionChannelVH).
         * Filters by the currently entered Sales Organization.
         */
        onDistChannelValueHelp: async function () {
            var oView = this.base.getView();
            var oUiModel = this._getUiModel();
            if (!this._oDistChannelVHDialog) {
                this._oDistChannelVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("distChannelLabel"),
                    contentWidth: "30rem",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("distChannelLabel") }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("colDescription") }) })
                    ],
                    items: {
                        path: "distChannelVH>/items",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{distChannelVH>DistributionChannel}" }),
                                new sap.m.Text({ text: "{distChannelVH>DistributionChannelText}" })
                            ]
                        })
                    },
                    confirm: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            oUiModel.setProperty("/newQuotation/distChannel", oSelectedItem.getCells()[0].getText());
                        }
                    },
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var aFilters = [];
                        if (sValue) {
                            aFilters.push(new Filter({
                                filters: [
                                    new Filter("DistributionChannel", FilterOperator.Contains, sValue),
                                    new Filter("DistributionChannelText", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            }));
                        }
                        oEvent.getSource().getBinding("items").filter(aFilters);
                    }
                });
                this._oDistChannelVHDialog.setModel(new JSONModel({ items: [] }), "distChannelVH");
                oView.addDependent(this._oDistChannelVHDialog);
            }
            BusyIndicator.show(0);
            try {
                var sSalesOrg = oUiModel.getProperty("/newQuotation/salesOrg") || "";
                var aF4Filters = [];
                if (sSalesOrg) {
                    aF4Filters.push({ field: "SalesOrganization", value: sSalesOrg });
                }
                var aData = await this._fetchF4Data(
                    "srvd_f4/sap/i_cmmdtydistributionchannelvh/0001;ps='srvd-zsd_sd_qt_load_temp-0001';va='com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.et-zi_sd_qt_material.distchannel'",
                    "I_CmmdtyDistributionChannelVH",
                    aF4Filters
                );
                this._oDistChannelVHDialog.getModel("distChannelVH").setProperty("/items", aData);
            } catch (e) {
                MessageToast.show(this._extractErrorMessage(e));
            } finally {
                BusyIndicator.hide();
            }
            this._oDistChannelVHDialog.open();
        },

        /**
         * Value-help handler for Division (I_ACMTrdgContrSalesDivisionVH).
         * Filters by the currently entered Sales Organization and Distribution Channel.
         */
        onDivisionValueHelp: async function () {
            var oView = this.base.getView();
            var oUiModel = this._getUiModel();
            if (!this._oDivisionVHDialog) {
                this._oDivisionVHDialog = new sap.m.TableSelectDialog({
                    title: this._getText("divisionLabel"),
                    contentWidth: "30rem",
                    columns: [
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("divisionLabel") }) }),
                        new sap.m.Column({ header: new sap.m.Text({ text: this._getText("colDescription") }) })
                    ],
                    items: {
                        path: "divisionVH>/items",
                        template: new sap.m.ColumnListItem({
                            cells: [
                                new sap.m.Text({ text: "{divisionVH>SalesDocumentDivision}" }),
                                new sap.m.Text({ text: "{divisionVH>DivisionName}" })
                            ]
                        })
                    },
                    confirm: function (oEvent) {
                        var oSelectedItem = oEvent.getParameter("selectedItem");
                        if (oSelectedItem) {
                            oUiModel.setProperty("/newQuotation/division", oSelectedItem.getCells()[0].getText());
                        }
                    },
                    search: function (oEvent) {
                        var sValue = oEvent.getParameter("value");
                        var aFilters = [];
                        if (sValue) {
                            aFilters.push(new Filter({
                                filters: [
                                    new Filter("SalesDocumentDivision", FilterOperator.Contains, sValue),
                                    new Filter("DivisionName", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            }));
                        }
                        oEvent.getSource().getBinding("items").filter(aFilters);
                    }
                });
                this._oDivisionVHDialog.setModel(new JSONModel({ items: [] }), "divisionVH");
                oView.addDependent(this._oDivisionVHDialog);
            }
            BusyIndicator.show(0);
            try {
                var sSalesOrg = oUiModel.getProperty("/newQuotation/salesOrg") || "";
                var sDistChannel = oUiModel.getProperty("/newQuotation/distChannel") || "";
                var aF4Filters = [];
                if (sSalesOrg) {
                    aF4Filters.push({ field: "SalesOrganization", value: sSalesOrg });
                }
                if (sDistChannel) {
                    aF4Filters.push({ field: "DistributionChannel", value: sDistChannel });
                }
                var aData = await this._fetchF4Data(
                    "srvd_f4/sap/i_acmtrdgcontrsalesdivisionvh/0001;ps='srvd-zsd_sd_qt_load_temp-0001';va='com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.et-zi_sd_qt_material.division'",
                    "I_ACMTrdgContrSalesDivisionVH",
                    aF4Filters
                );
                this._oDivisionVHDialog.getModel("divisionVH").setProperty("/items", aData);
            } catch (e) {
                MessageToast.show(this._extractErrorMessage(e));
            } finally {
                BusyIndicator.hide();
            }
            this._oDivisionVHDialog.open();
        },

        /**
         * Handler for "Add" button in QuotationDetail toolbar.
         * Calls GetQuotation with the existing table materials plus the newly entered material
         * and refreshes the Current Quotation table.
         */
        onQDAddMaterial: async function () {
            var oUiModel = this._getUiModel();
            var oForm = oUiModel.getProperty("/newQuotation") || {};
            var oView = this.base.getView();
            var oModel = oView.getModel();
            var sMaterial = String(oUiModel.getProperty("/quotationDetail/addMaterial") || "").trim();
            var oAddInput = oView.byId("quotationDetail--qdAddMaterialInput");

            if (!sMaterial) {
                if (oAddInput && oAddInput.setValueState) {
                    oAddInput.setValueState("Error");
                    oAddInput.setValueStateText(this._getText("msgFieldRequired"));
                }
                MessageToast.show(this._getText("msgFieldRequired"));
                return;
            }
            if (oAddInput && oAddInput.setValueState) {
                oAddInput.setValueState("None");
            }

            if (!oModel) {
                MessageBox.error(this._getText("msgAddMaterialFailed", [this._getText("msgMissingModel", ["main"])]));
                return;
            }

            BusyIndicator.show(0);
            try {
                var aExistingMaterials = (oUiModel.getProperty("/quotationDetail/items") || [])
                    .filter(function (oItem) { return String(oItem.ComponentID) === "0"; })
                    .map(function (oItem) {
                        return {
                            Material: oItem.Material || "",
                            MaterialType: oItem.MaterialType || "",
                            MaterialStatus: oItem.MaterialStatus || "",
                            CabinClass: oItem.CabinClass || "",
                            BomStatus: oItem.BomStatus || "",
                            Description: oItem.Description || "",
                            AirlineCode: oItem.AirlineCode || ""
                        };
                    });

                var bDuplicate = aExistingMaterials.some(function (oMaterial) {
                    return oMaterial.Material === sMaterial;
                });
                if (bDuplicate) {
                    MessageBox.error(this._getText("msgDuplicateMaterial", [sMaterial]));
                    return;
                }

                aExistingMaterials.push({
                    Material: sMaterial,
                    MaterialType: "",
                    MaterialStatus: "",
                    CabinClass: "",
                    BomStatus: "",
                    Description: "",
                    AirlineCode: ""
                });

                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetQuotation(...)");
                oActionBinding.setParameter("ContractNo", oForm.contractNo || "");
                oActionBinding.setParameter("GrossProfitMode", !!oForm.grossProfitMode);
                oActionBinding.setParameter("RoundUp", !!oForm.roundUp);
                oActionBinding.setParameter("SalesOrg", oForm.salesOrg || "");
                oActionBinding.setParameter("DistChannel", oForm.distChannel || "");
                oActionBinding.setParameter("Division", oForm.division || "");
                oActionBinding.setParameter("Customer", oForm.customer || "");
                oActionBinding.setParameter("EffectiveFrom", this._toEdmDateValue(oForm.effectiveFrom));
                oActionBinding.setParameter("EffectiveTo", this._toEdmDateValue(oForm.effectiveTo));
                oActionBinding.setParameter("AirlineCode", oForm.airline || "");
                oActionBinding.setParameter("_materialList", aExistingMaterials);

                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aRootResults = this._normalizeActionResultArray(vActionResult);
                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    MessageBox.error(this._getText("msgAddMaterialFailed", [sBusinessError]));
                    return;
                }

                var oRootResult = aRootResults[0] || {};
                var aItems = (oRootResult._quotation || []).map(function (oItem) {
                    return Object.assign({}, oItem);
                });
                aItems.sort(function (oA, oB) {
                    return String(oA.Item || "").localeCompare(String(oB.Item || ""), undefined, { numeric: true });
                });
                oUiModel.setProperty("/quotationDetail/items", aItems);
                if (oRootResult.QTType) {
                    oUiModel.setProperty("/newQuotation/qtType", oRootResult.QTType);
                }
                oUiModel.setProperty("/quotationDetail/addMaterial", "");
            } catch (oError) {
                MessageBox.error(this._getText("msgAddMaterialFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Handler for "Mass Update" button.
         * Updates LabourMMAdjFix and LabourSellRate for top-level rows (ComponentID = '0').
         * If rows are selected, only the selected top-level rows are updated; otherwise all
         * top-level rows in the current quotation are updated.
         */
        onQDMassUpdate: function () {
            var oUiModel = this._getUiModel();
            var oView = this.base.getView();
            var oTable = oView.byId("quotationDetail--qdCurrentQuotationTable");
            var aItems = oUiModel.getProperty("/quotationDetail/items") || [];

            var aSelectedIndices = oTable ? oTable.getSelectedIndices() : [];
            var aTargetIndices = aSelectedIndices.length ? aSelectedIndices : aItems.map(function (oItem, iIndex) { return iIndex; });

            aTargetIndices = aTargetIndices.filter(function (iIndex) {
                return aItems[iIndex] && String(aItems[iIndex].ComponentID) === "0";
            });

            if (!aTargetIndices.length) {
                MessageToast.show(this._getText("msgNoRootRowForMassUpdate"));
                return;
            }

            var sLabourMMAdjValue = oUiModel.getProperty("/quotationDetail/labourMMAdjValue");
            var sLabourSellRate = oUiModel.getProperty("/quotationDetail/labourSellRate");

            aTargetIndices.forEach(function (iIndex) {
                var oItem = aItems[iIndex];
                if (!oItem) { return; }
                if (sLabourMMAdjValue !== null && sLabourMMAdjValue !== undefined && sLabourMMAdjValue !== "") {
                    oItem.LabourMMAdjFix = sLabourMMAdjValue;
                }
                if (sLabourSellRate !== null && sLabourSellRate !== undefined && sLabourSellRate !== "") {
                    oItem.LabourSellRate = sLabourSellRate;
                }
            });

            oUiModel.setProperty("/quotationDetail/items", aItems);
            MessageToast.show(this._getText("msgMassUpdateSuccess", [aTargetIndices.length]));
            if (oTable) {
                oTable.clearSelection();
            }
        },

        /**
         * Handler for "Delete" button.
         * 
         */
        onQDDeleteQuotationDetailRows: function () {
            var oUiModel = this._getUiModel();
            var oView = this.base.getView();
            var oTable = oView.byId("quotationDetail--qdCurrentQuotationTable");
            var aItems = oUiModel.getProperty("/quotationDetail/items") || [];

            var aSelectedIndices = oTable ? oTable.getSelectedIndices() : [];
            if (!aSelectedIndices.length) {
                MessageToast.show(this._getText("msgSelectRowsToDelete"));
                return;
            }

            var aIndicesToDelete = aSelectedIndices.slice().sort(function (a, b) { return b - a; });
            aIndicesToDelete.forEach(function (iIndex) {
                aItems.splice(iIndex, 1);
            });

            oUiModel.setProperty("/quotationDetail/items", aItems);
            MessageToast.show(this._getText("msgDeleteRowsSuccess", [aSelectedIndices.length]));
            if (oTable) {
                oTable.clearSelection();
            }
        },


        /**
         * Splits Current Quotation flat rows into root trees (ComponentID = '0' + following components).
         * @param {object[]} aItems
         * @returns {{material: string, rows: object[]}[]}
         * @private
         */
        _splitQDItemsIntoTrees: function (aItems) {
            var aTrees = [];
            var oCurrent = null;
            (aItems || []).forEach(function (oItem) {
                if (String(oItem.ComponentID) === "0") {
                    oCurrent = {
                        material: String(oItem.Material || ""),
                        rows: [oItem]
                    };
                    aTrees.push(oCurrent);
                } else if (oCurrent) {
                    oCurrent.rows.push(oItem);
                }
            });
            return aTrees;
        },

        /**
         * Handler for "Refresh Markup" button.
         * Calls GetQuotation for selected top-level rows (ComponentID = '0').
         * If nothing is selected, all top-level rows are refreshed (same as Mass Update).
         * Only refreshed material trees are replaced; other rows are kept.
         */
        onQDRefreshMarkup: async function () {
            var oUiModel = this._getUiModel();
            var oForm = oUiModel.getProperty("/newQuotation") || {};
            var oView = this.base.getView();
            var oModel = oView.getModel();
            var oTable = oView.byId("quotationDetail--qdCurrentQuotationTable");
            var aAllItems = oUiModel.getProperty("/quotationDetail/items") || [];

            if (!oModel) {
                MessageBox.error(this._getText("msgAddMaterialFailed", [this._getText("msgMissingModel", ["main"])]));
                return;
            }

            var aSelectedIndices = oTable ? oTable.getSelectedIndices() : [];
            var aTargetIndices = aSelectedIndices.length
                ? aSelectedIndices
                : aAllItems.map(function (oItem, iIndex) { return iIndex; });

            aTargetIndices = aTargetIndices.filter(function (iIndex) {
                return aAllItems[iIndex] && String(aAllItems[iIndex].ComponentID) === "0";
            });

            if (!aTargetIndices.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            var oSelectedMaterials = {};
            var aRootItems = aTargetIndices.map(function (iIndex) {
                var oItem = aAllItems[iIndex];
                oSelectedMaterials[String(oItem.Material || "")] = true;
                return {
                    Material: oItem.Material || "",
                    MaterialType: oItem.MaterialType || "",
                    MaterialStatus: oItem.MaterialStatus || "",
                    CabinClass: oItem.CabinClass || "",
                    BomStatus: oItem.BomStatus || "",
                    Description: oItem.Description || "",
                    AirlineCode: oItem.AirlineCode || ""
                };
            });

            BusyIndicator.show(0);
            try {
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetQuotation(...)");
                oActionBinding.setParameter("ContractNo", oForm.contractNo || "");
                oActionBinding.setParameter("GrossProfitMode", !!oForm.grossProfitMode);
                oActionBinding.setParameter("RoundUp", !!oForm.roundUp);
                oActionBinding.setParameter("SalesOrg", oForm.salesOrg || "");
                oActionBinding.setParameter("DistChannel", oForm.distChannel || "");
                oActionBinding.setParameter("Division", oForm.division || "");
                oActionBinding.setParameter("Customer", oForm.customer || "");
                oActionBinding.setParameter("EffectiveFrom", this._toEdmDateValue(oForm.effectiveFrom));
                oActionBinding.setParameter("EffectiveTo", this._toEdmDateValue(oForm.effectiveTo));
                oActionBinding.setParameter("AirlineCode", oForm.airline || "");
                oActionBinding.setParameter("_materialList", aRootItems);

                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aRootResults = this._normalizeActionResultArray(vActionResult);
                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    MessageBox.error(this._getText("msgRefreshMarkupFailed", [sBusinessError]));
                    return;
                }

                var oRootResult = aRootResults[0] || {};
                var aRefreshedItems = (oRootResult._quotation || []).map(function (oItem) {
                    return Object.assign({}, oItem);
                });
                if (oRootResult.QTType) {
                    oUiModel.setProperty("/newQuotation/qtType", oRootResult.QTType);
                }
                var oRefreshedTreesByMaterial = {};
                this._splitQDItemsIntoTrees(aRefreshedItems).forEach(function (oTree) {
                    if (oTree.material) {
                        oRefreshedTreesByMaterial[oTree.material] = oTree.rows;
                    }
                });

                var aMergedItems = [];
                this._splitQDItemsIntoTrees(aAllItems).forEach(function (oTree) {
                    if (oSelectedMaterials[oTree.material] && oRefreshedTreesByMaterial[oTree.material]) {
                        aMergedItems = aMergedItems.concat(oRefreshedTreesByMaterial[oTree.material]);
                    } else if (!oSelectedMaterials[oTree.material]) {
                        aMergedItems = aMergedItems.concat(oTree.rows);
                    }
                });

                // Keep original tree order; renumber Item to avoid collisions after partial refresh
                aMergedItems.forEach(function (oItem, iIndex) {
                    oItem.Item = String((iIndex + 1) * 10);
                });
                oUiModel.setProperty("/quotationDetail/items", aMergedItems);

                MessageToast.show(this._getText("msgRefreshMarkupSuccess", [aRootItems.length]));
                if (oTable) {
                    oTable.clearSelection();
                }
            } catch (oError) {
                MessageBox.error(this._getText("msgRefreshMarkupFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Recomputes the pricing formulas for a single Current Quotation row, based on the
         * pricing spec (see onQDSimulation / _getQDFormulaDefs). Only columns whose derivation
         * could be confirmed from the spec are recalculated; all other columns (including
         * NetMargin/NetMarginPercent) keep their existing values.
         *
         * @param {object} oItem Quotation detail row
         * @returns {object} Map of property name to recalculated numeric value
         * @private
         */
        _computeQDSimulationRow: function (oItem, bGrossProfitMode) {
            function num(v) {
                var n = parseFloat(v);
                return isNaN(n) ? 0 : n;
            }
            function round2(v) {
                return Math.round(v * 100) / 100;
            }

            var OtherAdjustment = num(oItem.OtherAdjustment);
            var YieldedStandardFoodCost = num(oItem.YieldedStandardFoodCost);
            var STOverHead = num(oItem.STOverHead);

            // Inventory Cost (Finance)
            var LabourPrice = num(oItem.LabourMM) * num(oItem.LabourRate);
            var Total = num(oItem.YieldedFoodCost) + num(oItem.LabourMM) + num(oItem.LabourRate) + LabourPrice;

            // LabourMMAdjustment: do not calculate from SMPL if either is zero
            var nSMPLPercent = num(oItem.SMPLPercent);
            var nSMPLRatio = num(oItem.SMPLRatio);
            var LabourMMAdjustment;
            if (nSMPLPercent === 0 || nSMPLRatio === 0) {
                LabourMMAdjustment = num(oItem.LabourMMAdjustment);
            } else {
                LabourMMAdjustment = ((1 * (1 - nSMPLPercent / 100) + (nSMPLPercent / 100) * nSMPLRatio) - 1) * 100;
            }

            // Standard Cost (Commercial)
            var STMarkUp = YieldedStandardFoodCost * (1 + num(oItem.MarkUpPercent) / 100);
            var LabourCost = num(oItem.STLabourMM) * num(oItem.LabourCostRate);
            var AdjustedLabourMM = num(oItem.STLabourMM) * (1 + LabourMMAdjustment / 100);
            var nLabourMMAdjFix = num(oItem.LabourMMAdjFix);
            var nLabourSellRate = num(oItem.LabourSellRate);
            var nLabourCostRate = num(oItem.LabourCostRate);
            var STLabourPrice;
            if (nLabourMMAdjFix === 0 && nLabourSellRate === 0) {
                STLabourPrice = AdjustedLabourMM * nLabourCostRate;
            } else if (nLabourMMAdjFix === 0 && nLabourSellRate > 0) {
                STLabourPrice = AdjustedLabourMM * nLabourSellRate;
            } else if (nLabourMMAdjFix > 0 && nLabourSellRate === 0) {
                STLabourPrice = nLabourMMAdjFix * nLabourCostRate;
            } else {
                STLabourPrice = nLabourMMAdjFix * nLabourSellRate;
            }

            var AdjustedOverhead = STOverHead * (1 + num(oItem.STOverHeadPercent) / 100);

            // Mode-dependent: STTotal & SalesPriceFood
            var STTotal, SalesPriceFood;
            if (bGrossProfitMode) {
                STTotal = YieldedStandardFoodCost + OtherAdjustment;
                SalesPriceFood = YieldedStandardFoodCost + OtherAdjustment;
            } else {
                STTotal = STMarkUp + STLabourPrice + AdjustedOverhead + OtherAdjustment;
                SalesPriceFood = STMarkUp + OtherAdjustment;
            }

            var SalesPriceLabour = STLabourPrice;
            var SalesPriceOverhead = AdjustedOverhead;
            // Gross Profit Mode: TotalSellingPrice = SalesPriceFood only
            // Otherwise: SalesPriceFood + SalesPriceLabour + SalesPriceOverhead
            var TotalSellingPrice = bGrossProfitMode
                ? SalesPriceFood
                : SalesPriceFood + SalesPriceLabour + SalesPriceOverhead;

            var QuotedPrice = oItem.FreeofCharge ? 0 : TotalSellingPrice;

            var GrossProfit = QuotedPrice - YieldedStandardFoodCost;
            var GrossProfitPercent = TotalSellingPrice === 0 ? 0 : (GrossProfit / TotalSellingPrice) * 100;

            var NetMargin = QuotedPrice - YieldedStandardFoodCost - LabourCost - STOverHead;
            var NetMarginPercent = TotalSellingPrice === 0 ? 0 : (NetMargin / TotalSellingPrice) * 100;

            var ProposedNewPrice = QuotedPrice * (1 + num(oItem.IncrementPercent) / 100);
            return {
                LabourPrice: round2(LabourPrice).toFixed(2),
                Total: round2(Total).toFixed(2),
                LabourMMAdjustment: round2(LabourMMAdjustment).toFixed(2),
                STMarkUp: round2(STMarkUp).toFixed(2),
                LabourCost: round2(LabourCost).toFixed(2),
                AdjustedLabourMM: round2(AdjustedLabourMM).toFixed(2),
                STLabourPrice: round2(STLabourPrice).toFixed(2),
                AdjustedOverhead: round2(AdjustedOverhead).toFixed(2),
                STTotal: round2(STTotal).toFixed(2),
                SalesPriceFood: round2(SalesPriceFood).toFixed(2),
                SalesPriceLabour: round2(SalesPriceLabour).toFixed(2),
                SalesPriceOverhead: round2(SalesPriceOverhead).toFixed(2),
                TotalSellingPrice: round2(TotalSellingPrice).toFixed(2),
                GrossProfit: round2(GrossProfit).toFixed(2),
                GrossProfitPercent: round2(GrossProfitPercent).toFixed(4),
                NetMargin: round2(NetMargin).toFixed(2),
                NetMarginPercent: round2(NetMarginPercent).toFixed(4),
                QuotedPrice: round2(QuotedPrice).toFixed(2),
                ProposedNewPrice: round2(ProposedNewPrice).toFixed(2)
            };
        },

        /**
         * Handler for "Simulation" button.
         * Recalculates pricing for the selected rows. Only top-level rows (ComponentID = '0')
         * are allowed; shows an error otherwise.
         */
        onQDSimulation: function () {
            var oView = this.base.getView();
            var oTable = oView.byId("quotationDetail--qdCurrentQuotationTable");
            if (!oTable) {
                return;
            }

            var aSelectedIndices = oTable.getSelectedIndices();
            if (!aSelectedIndices.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            var bHasNonRoot = aSelectedIndices.some(function (iIndex) {
                var oCtx = oTable.getContextByIndex(iIndex);
                return oCtx && String(oCtx.getProperty("ComponentID")) !== "0";
            });

            if (bHasNonRoot) {
                MessageBox.error(this._getText("msgSimulationNonRootSelected"));
                return;
            }

            var bGrossProfitMode = !!this._getUiModel().getProperty("/newQuotation/grossProfitMode");
            aSelectedIndices.forEach(function (iIndex) {
                var oCtx = oTable.getContextByIndex(iIndex);
                if (!oCtx) { return; }
                var oResult = this._computeQDSimulationRow(oCtx.getObject(), bGrossProfitMode);
                Object.keys(oResult).forEach(function (sProperty) {
                    oCtx.setProperty(sProperty, oResult[sProperty]);
                });
            }.bind(this));

            MessageToast.show(this._getText("msgSimulationSuccess", [aSelectedIndices.length]));
        },

        /**
         * Lazily loads the bundled SheetJS (XLSX) library used to build Excel files with live formulas.
         * @returns {Promise<object>} The global XLSX namespace
         * @private
         */
        _ensureXlsxLoaded: function () {
            if (window.XLSX) {
                return Promise.resolve(window.XLSX);
            }
            if (this._pXlsxLoader) {
                return this._pXlsxLoader;
            }
            this._pXlsxLoader = new Promise(function (resolve, reject) {
                var oExistingScript = document.querySelector("script[data-xlsx-loader='true']");
                if (oExistingScript) {
                    oExistingScript.addEventListener("load", function () { resolve(window.XLSX); }, { once: true });
                    oExistingScript.addEventListener("error", function () { reject(new Error("Failed to load XLSX library")); }, { once: true });
                    return;
                }
                var oScript = document.createElement("script");
                oScript.src = sap.ui.require.toUrl("com/cathaydining/zsde005/createquo/lib/xlsx.full.min.js");
                oScript.async = true;
                oScript.setAttribute("data-xlsx-loader", "true");
                oScript.onload = function () { resolve(window.XLSX); };
                oScript.onerror = function () { reject(new Error("Failed to load XLSX library")); };
                document.head.appendChild(oScript);
            }).catch(function (oError) {
                this._pXlsxLoader = null;
                throw oError;
            }.bind(this));
            return this._pXlsxLoader;
        },

        /**
         * Derives the export column list (property + label) directly from the qdCurrentQuotationTable
         * columns, in the same order as displayed. The UI-only View button is omitted. A Quotation
         * column is inserted first; its header follows the active i18n language.
         * @returns {{property: string, label: string}[]} Ordered export column definitions
         * @private
         */
        _getQDExportColumnDefs: function () {
            var oTable = this.base.getView().byId("quotationDetail--qdCurrentQuotationTable");
            if (!oTable || !oTable.getColumns) {
                return [];
            }
            var aBindingProps = ["text", "number", "value", "selected", "title", "percentValue"];
            var aCols = oTable.getColumns().map(function (oColumn) {
                var sColumnId = oColumn.getId ? oColumn.getId() : "";
                if (sColumnId.indexOf("qdColView") !== -1) {
                    return null;
                }
                // Handle multiLabels: only the last (column) label is exported
                var aMultiLabels = oColumn.getMultiLabels ? oColumn.getMultiLabels() : [];
                var sLabel = "";
                if (aMultiLabels.length >= 2) {
                    sLabel = aMultiLabels[aMultiLabels.length - 1] && aMultiLabels[aMultiLabels.length - 1].getText ? aMultiLabels[aMultiLabels.length - 1].getText() : "";
                } else if (aMultiLabels.length === 1) {
                    sLabel = aMultiLabels[0] && aMultiLabels[0].getText ? aMultiLabels[0].getText() : "";
                } else {
                    var oLabel = oColumn.getLabel && oColumn.getLabel();
                    sLabel = oLabel && oLabel.getText ? oLabel.getText() : "";
                }

                var oTemplate = oColumn.getTemplate && oColumn.getTemplate();
                if (!oTemplate || !oTemplate.getBindingInfo) {
                    return null;
                }
                var sProperty = "";
                aBindingProps.some(function (sBindingProp) {
                    var oBindingInfo = oTemplate.getBindingInfo(sBindingProp);
                    var oPart = oBindingInfo && oBindingInfo.parts && oBindingInfo.parts[0];
                    // Ignore i18n-only bindings such as the View button text
                    if (oPart && oPart.path && oPart.model === "ui") {
                        sProperty = oPart.path;
                        return true;
                    }
                    return false;
                });
                if (!sLabel || !sProperty || sProperty === "Selected" || sProperty === "qdView") {
                    return null;
                }
                return { property: sProperty, label: sLabel };
            }).filter(Boolean);

            if (!aCols.some(function (oCol) { return oCol.property === "Quotation"; })) {
                aCols.unshift({
                    property: "Quotation",
                    label: this._getText("qdColQuotation")
                });
            }
            // Quotation Type must sit immediately after Quotation in the Excel export
            var iQuotationIdx = -1;
            var iQTTypeIdx = -1;
            aCols.forEach(function (oCol, iIdx) {
                if (oCol.property === "Quotation" && iQuotationIdx < 0) {
                    iQuotationIdx = iIdx;
                }
                if (oCol.property === "QTType" && iQTTypeIdx < 0) {
                    iQTTypeIdx = iIdx;
                }
            });
            if (iQuotationIdx >= 0) {
                if (iQTTypeIdx < 0) {
                    aCols.splice(iQuotationIdx + 1, 0, {
                        property: "QTType",
                        label: this._getText("qdColQTType")
                    });
                } else if (iQTTypeIdx !== iQuotationIdx + 1) {
                    var aQTTypeCol = aCols.splice(iQTTypeIdx, 1);
                    var iInsertAt = iQTTypeIdx < iQuotationIdx ? iQuotationIdx : iQuotationIdx + 1;
                    aCols.splice(iInsertAt, 0, aQTTypeCol[0]);
                }
            }
            return aCols;
        },

        /**
         * Builds Excel-native formula templates for the calculated columns whose derivation is
         * unambiguous (source fields confirmed from the pricing spec). NetMargin/NetMarginPercent are
         * exported as the static values returned by the backend, since their exact source formula could not be
         * reliably confirmed.
         * @param {Object<string, string>} mCol Map of property name to Excel column letter
         * @returns {Object<string, function(number): string>} Map of property name to formula builder (row number in)
         * @private
         */
        _getQDFormulaDefs: function (mCol, bGrossProfitMode) {
            function ref(sProp, iRow) {
                return mCol[sProp] + iRow;
            }
            return {
                LabourPrice: function (r) {
                    return ref("LabourMM", r) + "*" + ref("LabourRate", r);
                },
                Total: function (r) {
                    return ["YieldedFoodCost", "LabourMM", "LabourRate", "LabourPrice"]
                        .map(function (p) { return ref(p, r); }).join("+");
                },
                LabourMMAdjustment: function (r) {
                    return "IF(OR(" + ref("SMPLPercent", r) + "=0," + ref("SMPLRatio", r) + "=0)," + ref("LabourMMAdjustment", r) + ",((1*(1-" + ref("SMPLPercent", r) + "/100)+" + ref("SMPLPercent", r) + "/100*" + ref("SMPLRatio", r) + ")-1)*100)";
                },
                STMarkUp: function (r) {
                    return ref("YieldedStandardFoodCost", r) + "*(1+" + ref("MarkUpPercent", r) + "/100)";
                },
                LabourCost: function (r) {
                    return ref("STLabourMM", r) + "*" + ref("LabourCostRate", r);
                },
                AdjustedLabourMM: function (r) {
                    return ref("STLabourMM", r) + "*(1+" + ref("LabourMMAdjustment", r) + "/100)";
                },
                STLabourPrice: function (r) {
                    return "IF(AND(" + ref("LabourMMAdjFix", r) + "=0," + ref("LabourSellRate", r) + "=0)," +
                        ref("AdjustedLabourMM", r) + "*" + ref("LabourCostRate", r) + "," +
                        "IF(AND(" + ref("LabourMMAdjFix", r) + "=0," + ref("LabourSellRate", r) + ">0)," +
                        ref("AdjustedLabourMM", r) + "*" + ref("LabourSellRate", r) + "," +
                        "IF(AND(" + ref("LabourMMAdjFix", r) + ">0," + ref("LabourSellRate", r) + "=0)," +
                        ref("LabourMMAdjFix", r) + "*" + ref("LabourCostRate", r) + "," +
                        ref("LabourMMAdjFix", r) + "*" + ref("LabourSellRate", r) + ")))";
                },
                AdjustedOverhead: function (r) {
                    return ref("STOverHead", r) + "*(1+" + ref("STOverHeadPercent", r) + "/100)";
                },
                STTotal: bGrossProfitMode
                    ? function (r) {
                        return ref("YieldedStandardFoodCost", r) + "+" + ref("OtherAdjustment", r);
                    }
                    : function (r) {
                        return ["STMarkUp", "STLabourPrice", "AdjustedOverhead", "OtherAdjustment"]
                            .map(function (p) { return ref(p, r); }).join("+");
                    },
                SalesPriceFood: bGrossProfitMode
                    ? function (r) {
                        return ref("YieldedStandardFoodCost", r) + "+" + ref("OtherAdjustment", r);
                    }
                    : function (r) {
                        return ref("STMarkUp", r) + "+" + ref("OtherAdjustment", r);
                    },
                SalesPriceLabour: function (r) {
                    return ref("STLabourPrice", r);
                },
                SalesPriceOverhead: function (r) {
                    return ref("AdjustedOverhead", r);
                },
                TotalSellingPrice: bGrossProfitMode
                    ? function (r) {
                        return ref("SalesPriceFood", r);
                    }
                    : function (r) {
                        return ["SalesPriceFood", "SalesPriceLabour", "SalesPriceOverhead"]
                            .map(function (p) { return ref(p, r); }).join("+");
                    },
                GrossProfit: function (r) {
                    return ref("QuotedPrice", r) + "-" + ref("YieldedStandardFoodCost", r);
                },
                GrossProfitPercent: function (r) {
                    return "IF(" + ref("TotalSellingPrice", r) + "=0,0," + ref("GrossProfit", r) + "/" + ref("TotalSellingPrice", r) + "*100)";
                },
                NetMargin: function (r) {
                    return ref("QuotedPrice", r) + "-" + ref("YieldedStandardFoodCost", r) + "-" + ref("LabourCost", r) + "-" + ref("STOverHead", r);
                },
                NetMarginPercent: function (r) {
                    return "IF(" + ref("TotalSellingPrice", r) + "=0,0," + ref("NetMargin", r) + "/" + ref("TotalSellingPrice", r) + "*100)";
                },
                QuotedPrice: function (r) {
                    return "IF(" + ref("FreeofCharge", r) + "=TRUE,0," + ref("TotalSellingPrice", r) + ")";
                },
                ProposedNewPrice: function (r) {
                    return ref("QuotedPrice", r) + "*(1+" + ref("IncrementPercent", r) + "/100)";
                }
            };
        },

        /**
         * Handler for "Export" button on the Current Quotation table.
         * Exports all rows to an .xlsx file using the bundled SheetJS library, writing live Excel
         * formulas into the calculated columns whose derivation could be confirmed from the pricing
         * spec (Total, STMarkUp, LabourCost, AdjustedLabourMM, STLabourPrice, AdjustedOverhead,
         * STTotal, SalesPriceFood, SalesPriceLabour, SalesPriceOverhead, TotalSellingPrice,
         * GrossProfit, GrossProfitPercent, QuotedPrice, ProposedNewPrice). Column headers reflect the
         * currently active i18n language (en / zh_CN / zh_TW), read live from the table's Column labels.
         * All remaining columns (including user-editable inputs and NetMargin/NetMarginPercent) are
         * exported as static values. Sales Org, Dist. Channel, Division, Customer, Header Description,
         * Airline and Contract No. are taken from the quotation header for every row.
         */
        onQDExport: async function () {
            var oUiModel = this._getUiModel();
            var aItems = oUiModel.getProperty("/quotationDetail/items") || [];
            if (!aItems.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            var aCols = this._getQDExportColumnDefs();
            if (!aCols.length) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            // Header-level fields are stored on the quotation header, not on each Current Quotation row.
            var oForm = oUiModel.getProperty("/newQuotation") || {};
            var mHeaderFields = {
                SalesOrg: oForm.salesOrg || "",
                DistChannel: oForm.distChannel || "",
                Division: oForm.division || "",
                HeaderDesc: oForm.headerDesc || "",
                Customer: oForm.customer || "",
                AirlineCode: oForm.airline || "",
                ContractNo: oForm.contractNo || ""
            };

            BusyIndicator.show(0);
            try {
                var XLSX = await this._ensureXlsxLoaded();

                var mCol = {};
                aCols.forEach(function (oCol, i) {
                    mCol[oCol.property] = XLSX.utils.encode_col(i);
                });

                // Single header row with the column labels only
                var aoa = [];
                var iHeaderRowCount = 1;
                aoa.push(aCols.map(function (oCol) { return oCol.label; }));

                aItems.forEach(function (oItem) {
                    aoa.push(aCols.map(function (oCol) {
                        if (Object.prototype.hasOwnProperty.call(mHeaderFields, oCol.property)) {
                            return mHeaderFields[oCol.property];
                        }
                        return oItem[oCol.property];
                    }));
                });

                var oSheet = XLSX.utils.aoa_to_sheet(aoa);

                var bGrossProfitMode = !!this._getUiModel().getProperty("/newQuotation/grossProfitMode");
                var mFormulaDefs = this._getQDFormulaDefs(mCol, bGrossProfitMode);

                aItems.forEach(function (oItem, iIndex) {
                    var iExcelRow = iIndex + iHeaderRowCount + 1;
                    Object.keys(mFormulaDefs).forEach(function (sProperty) {
                        if (!mCol[sProperty]) {
                            return;
                        }
                        var sAddr = mCol[sProperty] + iExcelRow;
                        var nCached = parseFloat(oItem[sProperty]);
                        oSheet[sAddr] = {
                            t: "n",
                            f: mFormulaDefs[sProperty](iExcelRow),
                            v: isFinite(nCached) ? nCached : 0
                        };
                    });
                });

                var oWorkbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(oWorkbook, oSheet, "Quotation");
                XLSX.writeFile(oWorkbook, this._getText("qdExportFileName") + ".xlsx");
            } catch (oError) {
                MessageToast.show(this._getText("msgExportFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Handler for footer "Save Quotation" button.
         * Calls the SaveQuotation action with the current Current Quotation rows.
         */
        onQDSaveQuotation: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base.getView();
            var oModel = oView.getModel();
            var aItems = oUiModel.getProperty("/quotationDetail/items") || [];

            if (!oModel) {
                MessageBox.error(this._getText("msgSaveQuotationFailed", [this._getText("msgMissingModel", ["main"])]));
                return;
            }

            if (!aItems.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            var aDateErrors = this._validateQDValidDates(
                aItems, oUiModel.getProperty("/newQuotation") || {});
            if (aDateErrors.length) {
                oUiModel.refresh(true);
                MessageBox.error(this._getText("msgSaveQuotationInvalid"));
                return;
            }

            // Block save when any Current Quotation row still has Type "E"
            var aErrorItems = aItems.filter(function (oItem) {
                return String(oItem.Type || "").toUpperCase() === "E";
            });
            if (aErrorItems.length) {
                oUiModel.refresh(true);
                MessageBox.error(this._getText("msgSaveQuotationInvalid"));
                return;
            }

            var oForm = oUiModel.getProperty("/newQuotation") || {};

            BusyIndicator.show(0);
            try {
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.SaveQuotation(...)");
                oActionBinding.setParameter("Type", "");
                oActionBinding.setParameter("Message", "");
                oActionBinding.setParameter("QTNumber", "");
                oActionBinding.setParameter("QTType",
                    oUiModel.getProperty("/newQuotation/qtType")
                    || (aItems[0] && aItems[0].QTType)
                    || ""
                );
                oActionBinding.setParameter("DeleteFlag", false);
                oActionBinding.setParameter("SalesOrg", oForm.salesOrg || "");
                oActionBinding.setParameter("DistChannel", oForm.distChannel || "");
                oActionBinding.setParameter("Division", oForm.division || "");
                oActionBinding.setParameter("HeaderDesc", oForm.headerDesc || "");
                oActionBinding.setParameter("Customer", oForm.customer || "");
                oActionBinding.setParameter("CustomerName", "");
                oActionBinding.setParameter("AirlineCode", oForm.airline || "");
                oActionBinding.setParameter("ValidFrom", this._toEdmDateValue(oForm.effectiveFrom));
                oActionBinding.setParameter("ValidTo", this._toEdmDateValue(oForm.effectiveTo));
                oActionBinding.setParameter("ContractNo", oForm.contractNo || "");
                oActionBinding.setParameter("Sequence", "");
                oActionBinding.setParameter("RoundUp", !!oForm.roundUp);
                oActionBinding.setParameter("_quotation", aItems.map(function (oItem) {
                    return this._mapQDItemToSaveQuotationParam(oItem);
                }.bind(this)));

                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aRootResults = this._normalizeActionResultArray(vActionResult);
                var sBusinessError = this._extractActionBusinessError(aRootResults);
                if (sBusinessError) {
                    MessageBox.error(this._getText("msgSaveQuotationFailed", [sBusinessError]));
                    return;
                }

                var oResult = aRootResults[0] || {};
                var sQTNumber = oResult.QTNumber || "";
                var sQTType = oResult.QTType
                    || oUiModel.getProperty("/newQuotation/qtType")
                    || (aItems[0] && aItems[0].QTType)
                    || "";
                var sType = oResult.Type || "";
                var sMessage = oResult.Message || "";

                // Backfill _quotation items if returned by the service
                var aReturnedItems = oResult._quotation || [];
                if (aReturnedItems.length) {
                    oUiModel.setProperty("/quotationDetail/items", aReturnedItems.map(function (o) {
                        return Object.assign({}, o);
                    }));
                }
                var bHasItemError = aReturnedItems.some(function (oItem) {
                    return String(oItem.Type || "").toUpperCase() === "E";
                });
                if (sType === "E" || bHasItemError) {
                    MessageBox.error(this._getText("msgSaveQuotationFailed", [
                        sMessage || this._getText("msgSaveQuotationInvalid")
                    ]));
                    return;
                } else {
                    MessageToast.show(this._getText("msgSaveQuotationSuccess", [sQTNumber]));
                    // Update dialog title to QTNumber(QTType) via JSONModel binding
                    var sTitle = sQTNumber
                        ? sQTNumber + (sQTType ? "(" + sQTType + ")" : "")
                        : this._getText("qdTitle");
                    oUiModel.setProperty("/quotationDetail/Title", sTitle);
                    // After successful save, disable all buttons except Close
                    var oQDDialog = this._oQuotationDetailDialog || await this._pQuotationDetailDialog;
                    if (oQDDialog) {
                        // Fallback in case the title binding did not propagate
                        oQDDialog.setTitle(sTitle);
                        // Disable Save button
                        oQDDialog.getBeginButton().setEnabled(false);
                        // Disable all Button controls inside content
                        var oQDContent = oQDDialog.getContent()[0];
                        if (oQDContent) {
                            oQDContent.findAggregatedObjects(true).forEach(function (c) {
                                if (c.isA("sap.m.Button")) { c.setEnabled(false); }
                            });
                        }
                        // Clicking Close should navigate browser back two steps
                        oQDDialog.attachEventOnce("afterClose", function () {
                            window.history.go(-2);
                        });
                    }
                }
            } catch (oError) {
                MessageBox.error(this._getText("msgSaveQuotationFailed", [this._extractErrorMessage(oError)]));
            } finally {
                BusyIndicator.hide();
            }
        },

        /**
         * Maps a Current Quotation row to the deep parameter row required by SaveQuotation.
         *
         * @param {object} oItem Quotation detail row
         * @returns {object} SaveQuotation _quotation row
         * @private
         */
        _mapQDItemToSaveQuotationParam: function (oItem) {
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
                CostRunDate: this._toEdmDateValue(oItem.CostRunDate),
                QTStatus: oItem.QTStatus,
                ContractNo: oItem.ContractNo,
                Sequence: oItem.Sequence,
                ItemRemark: oItem.ItemRemark,
                Variant: oItem.Variant,
                YieldedFoodCost: oItem.YieldedFoodCost,
                LabourMM: oItem.LabourMM,
                LabourRate: oItem.LabourRate,
                LabourPrice: oItem.LabourPrice,
                Overhead: oItem.Overhead,
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
                OtherAdjustment: oItem.OtherAdjustment,
                STTotal: oItem.STTotal,
                SalesPriceFood: oItem.SalesPriceFood,
                SalesPriceLabour: oItem.SalesPriceLabour,
                SalesPriceOverhead: oItem.SalesPriceOverhead,
                TotalSellingPrice: oItem.TotalSellingPrice,
                FreeofCharge: oItem.FreeofCharge,
                GrossProfit: oItem.GrossProfit,
                GrossProfitPercent: oItem.GrossProfitPercent,
                NetMargin: oItem.NetMargin,
                NetMarginPercent: oItem.NetMarginPercent,
                QuotedPrice: oItem.QuotedPrice,
                IncrementPercent: oItem.IncrementPercent,
                ProposedNewPrice: oItem.ProposedNewPrice,
                SMPLPercent: oItem.SMPLPercent,
                SMPLRatio: oItem.SMPLRatio,
                PrecedingQT: oItem.PrecedingQT,
                Currency: oItem.Currency,
                ValidFrom: this._toEdmDateValue(oItem.ValidFrom),
                ValidTo: this._toEdmDateValue(oItem.ValidTo),
                DiffPrevQTPrice: oItem.DiffPrevQTPrice,
                PrevQT: oItem.PrevQT,
                PrevQTItem: oItem.PrevQTItem,
                PreQTPrice: oItem.PreQTPrice,
                PrevQTCost: oItem.PrevQTCost,
                Margin: oItem.Margin,
                MarginPercnt: oItem.MarginPercnt,
                PrevValidFrom: this._toEdmDateValue(oItem.PrevValidFrom),
                PrevValidTo: this._toEdmDateValue(oItem.PrevValidTo),
                ComponentID: oItem.ComponentID,
                Message: oItem.Message
            };
        },

        /**
         * Reads the result object from an executed OData V4 action binding.
         * @param {sap.ui.model.odata.v4.ODataContextBinding} oActionBinding Executed action binding
         * @returns {Promise<object>} Action result payload
         * @private
         */
        _requestActionResult: async function (oActionBinding) {
            var oContext = oActionBinding.getBoundContext();
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
         * Normalizes an OData action result into a plain array.
         * @param {*} vResult Raw action result
         * @returns {object[]} Normalized array
         * @private
         */
        _normalizeActionResultArray: function (vResult) {
            if (Array.isArray(vResult)) {
                return vResult;
            }
            if (vResult && typeof vResult === "object" && Array.isArray(vResult.value)) {
                return vResult.value;
            }
            if (vResult && typeof vResult === "object") {
                return [vResult];
            }
            return [];
        },

        /**
         * Extracts a business error message (Type === "E") from action results.
         * @param {object[]} aResults Normalized action results
         * @returns {string|null} Error message or null
         * @private
         */
        _extractActionBusinessError: function (aResults) {
            var oErrorRoot = (aResults || []).find(function (oRoot) {
                var sType = String((oRoot && (oRoot.Type || oRoot.type)) || "").toUpperCase();
                return sType === "E" || sType === "A";
            });

            return oErrorRoot && (oErrorRoot.Mesage || oErrorRoot.Message || oErrorRoot.message)
                ? (oErrorRoot.Mesage || oErrorRoot.Message || oErrorRoot.message)
                : "";
        },

        /**
         * Extracts a human-readable message from an error object.
         * @param {*} oError Error thrown by the action execution
         * @returns {string} Error message
         * @private
         */
        _extractErrorMessage: function (oError) {
            if (!oError) {
                return "";
            }
            if (typeof oError === "string") {
                return oError;
            }
            return oError.message || oError.statusText || JSON.stringify(oError);
        },

        /**
         * Retrieves a translated text from the i18n resource bundle.
         * @param {string} sKey Text key
         * @param {string[]} [aArgs] Optional placeholder arguments
         * @returns {string} Translated text
         * @private
         */
        _getText: function (sKey, aArgs) {
            return this.base.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        /**
         * Returns the sap.ui.core.ValueState for the Message column based on the Type field.
         * @param {string} sType Message type (E/S/W/I)
         * @returns {string} ValueState name
         */
        _formatMessageState: function (sType) {
            switch (String(sType || "").toUpperCase()) {
                case "E": return "Error";
                case "S": return "Success";
                case "W": return "Warning";
                case "I": return "Information";
                default: return "None";
            }
        },

        /**
         * Clamps a percentage value to the [0, 100] range expected by sap.m.ProgressIndicator's
         * percentValue property (the bar fill itself cannot represent negative or >100% values).
         * @param {number|string} vValue Raw percentage value
         * @returns {number} Value clamped to [0, 100]
         */
        _formatPercentIndicatorValue: function (vValue) {
            var n = parseFloat(vValue);
            if (isNaN(n)) { return 0; }
            return Math.max(0, Math.min(100, n));
        },

        /**
         * Formats a raw (unclamped) percentage value as a 2-decimal display string, e.g. "12.35%".
         * @param {number|string} vValue Raw percentage value
         * @returns {string} Formatted percentage text
         */
        _formatPercentDisplayValue: function (vValue) {
            var n = parseFloat(vValue);
            if (isNaN(n)) { n = 0; }
            return n.toFixed(2) + "%";
        },

        /**
         * Loads BOM data for the selected row and opens the BOM detail dialog.
         */
        onQDViewItem: async function (oEvent) {
            var oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            var oCtx = oSource && oSource.getBindingContext ? oSource.getBindingContext("ui") : null;
            // GridTable template: climb parents if the button has no row context yet
            if (!oCtx && oSource) {
                var oParent = oSource.getParent && oSource.getParent();
                while (oParent && !oCtx) {
                    oCtx = oParent.getBindingContext && oParent.getBindingContext("ui");
                    oParent = oParent.getParent && oParent.getParent();
                }
            }
            var oCurrentItem = oCtx && oCtx.getObject ? oCtx.getObject() || {} : {};
            // ZA_SD_QUOTATION line has no SalesOrg/Customer — take from newQuotation header
            var oForm = this._getUiModel().getProperty("/newQuotation") || {};
            var oView = this.base.getView();
            var oModel = oView.getModel();
            var oActionBinding;
            var aBomItems = [];
            var aPriceHistory = [];
            var aTree;
            var vActionResult;
            var aRootResults;
            var sBusinessError;
            var oRoot;
            var mParams;

            if (!oModel) {
                MessageBox.error(this._getText("msgMissingModel", ["main"]));
                return;
            }

            mParams = {
                Material: oCurrentItem.Material || "",
                SalesOrg: oCurrentItem.SalesOrg || oForm.salesOrg || "",
                DistChannel: oCurrentItem.DistChannel || oForm.distChannel || "",
                Division: oCurrentItem.Division || oForm.division || "",
                Customer: oCurrentItem.Customer || oForm.customer || "",
                EffectiveFrom: this._toEdmDateValue(
                    oCurrentItem.EffectiveFrom || oCurrentItem.ValidFrom || oCurrentItem.Effectivefrom || oForm.effectiveFrom
                )
            };

            if (!mParams.Material || !mParams.SalesOrg || !mParams.DistChannel || !mParams.Division || !mParams.Customer) {
                MessageBox.error("Please select a valid row.");
                return;
            }

            oView.setBusy(true);
            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetBOM(...)");
                Object.keys(mParams).forEach(function (sKey) {
                    oActionBinding.setParameter(sKey, mParams[sKey]);
                });
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    throw new Error(sBusinessError);
                }

                oRoot = aRootResults[0] || {};
                aBomItems = Array.isArray(oRoot._bomList) ? oRoot._bomList : [];
                aPriceHistory = Array.isArray(oRoot._priceHistory) ? oRoot._priceHistory : [];

                aTree = this._buildBomTreeData(aBomItems);
                this._getUiModel().setProperty("/quotationDetail/bom", {
                    title: oCurrentItem.Material,
                    tree: aTree,
                    priceHistory: aPriceHistory
                });

                await this._openBomTreeDialog();
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                oView.setBusy(false);
            }
        },

        /**
         * Closes the BOM dialog if it has already been created.
         */
        onCloseBomTreeDialog: function () {
            if (this._oBomTreeDialog && this._oBomTreeDialog.close) {
                this._oBomTreeDialog.close();
            }
        },

        /**
         * Converts flat BOM rows into a hierarchical structure for the tree table.
         * @param {object[]} aItems Flat BOM rows
         * @returns {object[]}
         * @private
         */
        _buildBomTreeData: function (aItems) {
            var aRows = Array.isArray(aItems) ? aItems : [];
            var mNodesByLevelPred = new Map();
            var aNodes = aRows.map(function (oRow, iIdx) {
                var iLevel = Number(oRow && oRow.BomLevel);
                var iPred = Number(oRow && oRow.PathPredecessor);
                var iParentPred = Number(oRow && oRow.ParentPath);
                var sKey = [String(iLevel), String(iPred)].join("-");
                var oNode = {
                    key: sKey,
                    BomLevel: isNaN(iLevel) ? "" : iLevel,
                    PathPredecessor: isNaN(iPred) ? "" : iPred,
                    ParentPath: isNaN(iParentPred) ? "" : iParentPred,
                    Material: oRow && oRow.Material || "",
                    MaterialDesc: oRow && oRow.MaterialDesc || "",
                    ValidFrom: oRow && oRow.ValidFrom || "",
                    ValidTo: oRow && oRow.ValidTo || "",
                    Price: oRow && oRow.Price || "",
                    Currency: oRow && oRow.Currency || "",
                    _index: iIdx,
                    children: []
                };

                mNodesByLevelPred.set(sKey, oNode);
                return oNode;
            });
            var aRoots = [];

            aNodes.forEach(function (oNode) {
                var iLevel = Number(oNode.BomLevel);
                var iParentPred = Number(oNode.ParentPath);
                var sParentKey = [String(iLevel - 1), String(iParentPred)].join("-");

                if (iLevel > 0 && mNodesByLevelPred.has(sParentKey)) {
                    mNodesByLevelPred.get(sParentKey).children.push(oNode);
                } else {
                    aRoots.push(oNode);
                }
            });

            return aRoots;
        },

        /**
         * Opens the BOM dialog and lazily loads the fragment on first use.
         * @returns {Promise<void>}
         * @private
         */
        _openBomTreeDialog: function () {
            var oView = this.base.getView();

            if (!oView) {
                return Promise.resolve();
            }

            if (this._oBomTreeDialog) {
                this._oBomTreeDialog.open();
                return Promise.resolve();
            }

            return Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.createquo.ext.fragments.BomTreeView",
                controller: this
            }).then(function (oDialog) {
                this._oBomTreeDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
        * Convenience accessor for the local UI JSONModel.
        * @returns {sap.ui.model.json.JSONModel} UI model instance
        */
        _getUiModel() {
            return this.getView().getModel("ui");
        },

        /**
         * Adds a fullscreen toggle button to the Dialog header.
         * Replaces the default header with a custom Bar containing the original title
         * and a toggle icon button.
         * @param {sap.m.Dialog} oDialog The dialog to enhance
         * @private
         */
        _setupDialogFullScreenToggle: function (oDialog) {
            var oFullScreenBtn = new Button({
                icon: oDialog.getStretch() ? "sap-icon://exit-full-screen" : "sap-icon://full-screen",
                type: "Transparent",
                press: function () {
                    var bStretch = !oDialog.getStretch();
                    oDialog.setStretch(bStretch);
                    oFullScreenBtn.setIcon(bStretch ? "sap-icon://exit-full-screen" : "sap-icon://full-screen");
                }
            });
            var oTitle = new sap.m.Title();
            var oBindingInfo = oDialog.getBindingInfo("title");
            if (oBindingInfo) {
                // getBindingInfo returns the dialog's live binding instance - reusing it
                // would not update this Title, so create a fresh binding instead
                var oTitleBindingInfo = Object.assign({}, oBindingInfo);
                delete oTitleBindingInfo.binding;
                oTitle.bindProperty("text", oTitleBindingInfo);
            } else {
                oTitle.setText(oDialog.getTitle());
            }
            oDialog.setCustomHeader(new sap.m.Bar({
                contentMiddle: [oTitle],
                contentRight: [oFullScreenBtn]
            }));
        }
    });
});
