sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/m/TableSelectDialog",
    "sap/m/ColumnListItem",
    "sap/m/Column",
    "sap/m/Text",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/PDFViewer",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "com/cathaydining/zsde005/changequo/ext/controller/QuotationExcel"
], function (ControllerExtension, MessageToast, MessageBox, Fragment, TableSelectDialog, ColumnListItem, Column, Text, Filter, FilterOperator, PDFViewer, JSONModel, BusyIndicator, QuotationExcel) {
    'use strict';

    return ControllerExtension.extend("com.cathaydining.zsde005.changequo.ext.controller.ObjectPageExtension", {
        override: {
            /**
             * Initializes extension-local state for edit mode and loaded quotation handling.
             */
            onInit: function () {
                var oView = this.base && this.base.getView ? this.base.getView() : null;
                if (!oView) { return; }
                oView.setModel(new JSONModel({
                    bom: {
                        title: "",
                        tree: [],
                        priceHistory: []
                    }
                }), "ui");
            },

            /**
             * Cleans up dependent controls and listeners created by the extension.
             */
            onExit: function () {
                var oView = this.base && this.base.getView ? this.base.getView() : null;
                if (this._oBomTreeDialog) {
                    this._oBomTreeDialog.destroy();
                    this._oBomTreeDialog = null;
                }

                if (this._oAviQuotationDialog) {
                    this._oAviQuotationDialog.destroy();
                    this._oAviQuotationDialog = null;
                }

                if (this._oAviTemplateVHDialog) {
                    this._oAviTemplateVHDialog.destroy();
                    this._oAviTemplateVHDialog = null;
                }

                if (this._oNonAviQuotationDialog) {
                    this._oNonAviQuotationDialog.destroy();
                    this._oNonAviQuotationDialog = null;
                }

                if (this._oNonAviPreviewDialog) {
                    this._oNonAviPreviewDialog.destroy();
                    this._oNonAviPreviewDialog = null;
                }
            }
        },

        onCloseNonAviPreviewDialog: function () {
            if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.close) {
                this._oNonAviPreviewDialog.close();
            }
        },

        onCloseAviQuotationDialog: function () {
            if (this._oAviQuotationDialog && this._oAviQuotationDialog.close) {
                this._oAviQuotationDialog.close();
            }
        },

        onCloseNonAviQuotationDialog: function () {
            if (this._oNonAviQuotationDialog && this._oNonAviQuotationDialog.close) {
                this._oNonAviQuotationDialog.close();
            }
        },

        /**
         * Selling Matrix
         */
        onSellingMatrix: async function (oEvent,aContexts) {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oHeaderContext = oView ? oView.getBindingContext() : null;
            var oHeaderData = oHeaderContext && oHeaderContext.getObject ? (oHeaderContext.getObject() || {}) : {};
            var oActionBinding;
            var vActionResult;
            var aRootResults;
            var oResult;
            var sFileContent;
            var sBase64;
            var sBinary;
            var oBytes;
            var oBlob;
            var sObjectUrl;
            var oLink;

            if (!aContexts || aContexts.length < 1) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            oView.setBusy(true);

            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GenerateSellingMatrix(...)");
                oActionBinding.setParameter("Quotation", oHeaderData.Quotation || "");
                oActionBinding.setParameter("AirlineCode", oHeaderData.AirlineCode || "");
                oActionBinding.setParameter("Items", aContexts.map(function (Context) {
                    return {
                        Quotation: oHeaderData.Quotation,
                        Item: Context.getObject().Item,
                        Matnr: Context.getObject().Material,
                        CabinClass: Context.getObject().CabinClass,
                        CycleNum: Context.getObject().Cycle,
                        SectorCode: Context.getObject().Sector,
                        LoadscaleCode: Context.getObject().LoadscaleCode,
                    };
                }));
                oActionBinding.setParameter("PaxList", []);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                oResult = aRootResults[0] || {};

                if (!oResult.IsSuccess) {
                    MessageBox.error(oResult.Message || this._getText("msgFailedToGenerateQuotation"));
                    return;
                }

                sFileContent = oResult.FileContent || "";
                if (!sFileContent) {
                    MessageToast.show(this._getText("msgNoFileContent"));
                    return;
                }

                sBase64 = sFileContent.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
                while (sBase64.length % 4 !== 0) {
                    sBase64 += "=";
                }
                sBinary = window.atob(sBase64);
                oBytes = new Uint8Array(sBinary.length);
                for (var i = 0; i < sBinary.length; i++) {
                    oBytes[i] = sBinary.charCodeAt(i);
                }
                oBlob = new Blob([oBytes], {
                    type: oResult.MimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                });
                sObjectUrl = URL.createObjectURL(oBlob);
                oLink = document.createElement("a");
                oLink.href = sObjectUrl;
                oLink.download = oResult.FileName || "selling-matrix.xlsx";
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sObjectUrl);
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                oView.setBusy(false);
            }
        },

        /**
         * Print Out fields for the selected table rows.
         */
        onAviQuotation: async function (oEvent, aContexts) {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oUiModel = this._getUiModel();
            var oHeaderContext = oView ? oView.getBindingContext() : null;
            var oHeaderData = oHeaderContext && oHeaderContext.getObject ? (oHeaderContext.getObject() || {}) : {};
            var aSelectedContexts = aContexts || [];

            if (!aSelectedContexts.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            oView.setBusy(true);
            try {
                if (oModel) {
                    var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetDefaultAviTemplate(...)");
                    oActionBinding.setParameter("Kunnr", oHeaderData.Customer);
                    oActionBinding.setParameter("Vkorg", oHeaderData.SalesOrg);
                    oActionBinding.setParameter("Vtweg", oHeaderData.DistChannel);
                    oActionBinding.setParameter("Spart", oHeaderData.Division);
                    oActionBinding.setParameter("Zname", "");
                    await oActionBinding.execute();

                    var vActionResult = await this._requestActionResult(oActionBinding);
                    if (vActionResult) {
                        oUiModel.setProperty("/AviQuotation", {
                            Vbeln: oHeaderData.Quotation || "",
                            Posnr: oHeaderData.Item || "",
                            Kunnr: oHeaderData.Customer || "",
                            Vkorg: oHeaderData.SalesOrg || "",
                            Vtweg: oHeaderData.DistChannel || "",
                            Spart: oHeaderData.Division || "",
                            TemplateName: "",
                            Zname: vActionResult.Zname || "",
                            EffectiveFrom: oHeaderData.EffectiveFrom || null,
                            ZDefault: false,
                            Zremark: vActionResult.Zremark || "",
                            Zterms: vActionResult.Zterms || "",
                            CabinClassItems: [],
                            CycleItems: [],
                            SelectedCabinClasses: [],
                            SelectedCycles: [],
                            fields: {
                                Zmatnr: vActionResult.Zmatnr || false,
                                Zuplift: vActionResult.Zuplift || false,
                                ZdescEn: vActionResult.ZdescEn || false,
                                Zqty: vActionResult.Zqty || false,
                                Zuom: vActionResult.Zuom || false,
                                Zprice: vActionResult.Zprice || false,
                                ZshowComp: vActionResult.ZshowComp || false,
                                Zratio: vActionResult.Zratio || false,
                                ZrevisedPirce: vActionResult.ZrevisedPirce || false,
                                Zphoto: vActionResult.Zphoto || false,
                                Zallergen: vActionResult.Zallergen || false,
                                ZcostFood: vActionResult.ZcostFood || false,
                                ZcostLabmm: vActionResult.ZcostLabmm || false,
                                ZcostLabsell: vActionResult.ZcostLabsell || false,
                                ZcostOvhd: vActionResult.ZcostOvhd || false,
                                ZcostOther: vActionResult.ZcostOther || false
                            },
                            SelectedRowData: aSelectedContexts.map(function (oCtx) {
                                var oItem = oCtx.getObject ? oCtx.getObject() : {};
                                return {
                                    Vbeln: oItem.Quotation || "",
                                    Posnr: oItem.Item || ""
                                };
                            })
                        });

                        await this._loadAviCabinClasses();
                        await this._loadAviCycles();
                    }
                }
                this._openAviQuotationDialog();
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                oView.setBusy(false);
            }
        },

         /**
         * Calls the PreviewAviQuotationPdf action and opens the returned PDF.
         */
        onAviQuotationPreview: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oAviQuotation = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var oFields = oAviQuotation.fields || {};
            var oActionBinding;
            var vActionResult;
            var aRootResults;
            var sBusinessError;

            if (!oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (this._oAviQuotationDialog && this._oAviQuotationDialog.setBusy) {
                this._oAviQuotationDialog.setBusy(true);
            }

            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.PreviewAviQuotationPdf(...)");
                oActionBinding.setParameter("Vbeln", oAviQuotation.Vbeln);
                oActionBinding.setParameter("Posnr", oAviQuotation.Posnr);
                oActionBinding.setParameter("Kunnr", oAviQuotation.Kunnr);
                oActionBinding.setParameter("Vkorg", oAviQuotation.Vkorg);
                oActionBinding.setParameter("Vtweg", oAviQuotation.Vtweg);
                oActionBinding.setParameter("Spart", oAviQuotation.Spart);
                oActionBinding.setParameter("EffectiveFrom", oAviQuotation.EffectiveFrom);
                oActionBinding.setParameter("Zremark", oAviQuotation.Zremark);
                oActionBinding.setParameter("Zterms", oAviQuotation.Zterms);
                oActionBinding.setParameter("Zmatnr", oFields.Zmatnr);
                oActionBinding.setParameter("Zuplift", oFields.Zuplift);
                oActionBinding.setParameter("ZdescEn", oFields.ZdescEn);
                oActionBinding.setParameter("Zuom", oFields.Zuom);
                oActionBinding.setParameter("Zqty", oFields.Zqty);
                oActionBinding.setParameter("Zprice", oFields.Zprice);
                oActionBinding.setParameter("ZshowComp", oFields.ZshowComp);
                oActionBinding.setParameter("Zratio", oFields.Zratio);
                oActionBinding.setParameter("ZrevisedPirce", oFields.ZrevisedPirce);
                oActionBinding.setParameter("Zphoto", oFields.Zphoto);
                oActionBinding.setParameter("Zallergen", oFields.Zallergen);
                oActionBinding.setParameter("ZcostFood", oFields.ZcostFood);
                oActionBinding.setParameter("ZcostLabmm", oFields.ZcostLabmm);
                oActionBinding.setParameter("ZcostLabsell", oFields.ZcostLabsell);
                oActionBinding.setParameter("ZcostOvhd", oFields.ZcostOvhd);
                oActionBinding.setParameter("ZcostOther", oFields.ZcostOther);
                oActionBinding.setParameter("CabinClassFilters", (oAviQuotation.SelectedCabinClasses || []).map(function (sCabinClass) {
                    return { CabinClass: sCabinClass };
                }));
                oActionBinding.setParameter("CycleFilters", (oAviQuotation.SelectedCycles || []).map(function (sCycle) {
                    return { Cycle: sCycle };
                }));
                oActionBinding.setParameter("Items", oAviQuotation.SelectedRowData);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    MessageBox.error(sBusinessError);
                    return;
                }

                var oResult = aRootResults[0] || {};

                if (!oResult.IsSuccess) {
                    MessageBox.error(oResult.Message || this._getText("msgFailedToGenerateQuotation"));
                    return;
                }

                this._openPdfPreview(oView, {
                    form: oResult.FileContent || "",
                    mimetype: oResult.MimeType || "application/pdf",
                    filename: oResult.FileName || "preview.pdf"
                });
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                if (this._oAviQuotationDialog && this._oAviQuotationDialog.setBusy) {
                    this._oAviQuotationDialog.setBusy(false);
                }
            }
        },

        /**
         * Calls the GenerateAviQuotation action with the current print-out configuration.
         */
        onAviQuotationExportExcel: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oAviQuotation = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var oFields = oAviQuotation.fields || {};
            var oActionBinding;
            var vActionResult;
            var aRootResults;
            var sBusinessError;

            if (!oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (this._oAviQuotationDialog && this._oAviQuotationDialog.setBusy) {
                this._oAviQuotationDialog.setBusy(true);
            }

            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GenerateAviQuotation(...)");
                oActionBinding.setParameter("Vbeln", oAviQuotation.Vbeln);
                oActionBinding.setParameter("Posnr", oAviQuotation.Posnr);
                oActionBinding.setParameter("Kunnr", oAviQuotation.Kunnr);
                oActionBinding.setParameter("Vkorg", oAviQuotation.Vkorg);
                oActionBinding.setParameter("Vtweg", oAviQuotation.Vtweg);
                oActionBinding.setParameter("Spart", oAviQuotation.Spart);
                oActionBinding.setParameter("EffectiveFrom", oAviQuotation.EffectiveFrom);
                oActionBinding.setParameter("Zremark", oAviQuotation.Zremark);
                oActionBinding.setParameter("Zterms", oAviQuotation.Zterms);
                oActionBinding.setParameter("Zmatnr", oFields.Zmatnr);
                oActionBinding.setParameter("Zuplift", oFields.Zuplift);
                oActionBinding.setParameter("ZdescEn", oFields.ZdescEn);
                oActionBinding.setParameter("Zuom", oFields.Zuom);
                oActionBinding.setParameter("Zqty", oFields.Zqty);
                oActionBinding.setParameter("Zprice", oFields.Zprice);
                oActionBinding.setParameter("ZshowComp", oFields.ZshowComp);
                oActionBinding.setParameter("Zratio", oFields.Zratio);
                oActionBinding.setParameter("ZrevisedPirce", oFields.ZrevisedPirce);
                oActionBinding.setParameter("Zphoto", oFields.Zphoto);
                oActionBinding.setParameter("Zallergen", oFields.Zallergen);
                oActionBinding.setParameter("ZcostFood", oFields.ZcostFood);
                oActionBinding.setParameter("ZcostLabmm", oFields.ZcostLabmm);
                oActionBinding.setParameter("ZcostLabsell", oFields.ZcostLabsell);
                oActionBinding.setParameter("ZcostOvhd", oFields.ZcostOvhd);
                oActionBinding.setParameter("ZcostOther", oFields.ZcostOther);
                oActionBinding.setParameter("CabinClassFilters", (oAviQuotation.SelectedCabinClasses || []).map(function (sCabinClass) {
                    return { CabinClass: sCabinClass };
                }));
                oActionBinding.setParameter("CycleFilters", (oAviQuotation.SelectedCycles || []).map(function (sCycle) {
                    return { Cycle: sCycle };
                }));
                oActionBinding.setParameter("Items", oAviQuotation.SelectedRowData);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    MessageBox.error(sBusinessError);
                    return;
                }

                var oResult = aRootResults[0] || {};

                if (!oResult.IsSuccess) {
                    MessageBox.error(oResult.Message || this._getText("msgFailedToGenerateQuotation"));
                    return;
                }

                var sFileContent = oResult.FileContent || "";
                var sFileName = oResult.FileName || "quotation.xlsx";
                var sMimeType = oResult.MimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                if (!sFileContent) {
                    MessageToast.show("No file content returned from the server.");
                    return;
                }

                var sBase64 = sFileContent.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
                while (sBase64.length % 4 !== 0) { sBase64 += "="; }
                var sBinary = window.atob(sBase64);
                var oBytes = new Uint8Array(sBinary.length);
                for (var i = 0; i < sBinary.length; i++) {
                    oBytes[i] = sBinary.charCodeAt(i);
                }
                var oBlob = new Blob([oBytes], { type: sMimeType });
                var sObjectUrl = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sObjectUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sObjectUrl);

                if (this._oAviQuotationDialog && this._oAviQuotationDialog.close) {
                    this._oAviQuotationDialog.close();
                }
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                if (this._oAviQuotationDialog && this._oAviQuotationDialog.setBusy) {
                    this._oAviQuotationDialog.setBusy(false);
                }
            }
        },
        
        onAviTemplateVH: function (oEvent) {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oUiModel = this._getUiModel();
            var oModel = oView ? oView.getModel() : null;
            var oAvi = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var aMainFilters = [];

            if (!oView || !oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (!oAvi.Kunnr || !oAvi.Vkorg || !oAvi.Vtweg || !oAvi.Spart) {
                MessageToast.show("Missing Kunnr/Vkorg/Vtweg/Spart");
                return;
            }

            aMainFilters = [
                new Filter("Kunnr", FilterOperator.EQ, oAvi.Kunnr),
                new Filter("Vkorg", FilterOperator.EQ, oAvi.Vkorg),
                new Filter("Vtweg", FilterOperator.EQ, oAvi.Vtweg),
                new Filter("Spart", FilterOperator.EQ, oAvi.Spart)
            ];

            if (!this._oAviTemplateVHDialog) {
                this._oAviTemplateVHDialog = new TableSelectDialog({
                    title: "Select Template",
                    liveChange: this.onAviTemplateVHSearch.bind(this),
                    search: this.onAviTemplateVHSearch.bind(this),
                    confirm: function (oEvt) {
                        var oItem = oEvt.getParameter("selectedItem");
                        var oCtx = oItem && oItem.getBindingContext();
                        var oObj = oCtx && oCtx.getObject ? oCtx.getObject() : null;
                        if (oObj && oUiModel) {
                            oUiModel.setProperty("/AviQuotation/Zname", oObj.Zname || "");
                        }
                    }.bind(this),
                    cancel: function () { }
                });

                var aCols = [
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColCustomer") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColSalesOrg") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDistChannel") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDivision") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColName") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDefault") }) })
                ];

                aCols.forEach(function (c) { this._oAviTemplateVHDialog.addColumn(c); }.bind(this));

                var oTemplate = new ColumnListItem({
                    cells: [
                        new Text({ text: "{Kunnr}" }),
                        new Text({ text: "{Vkorg}" }),
                        new Text({ text: "{Vtweg}" }),
                        new Text({ text: "{Spart}" }),
                        new Text({ text: "{Zname}" }),
                        new Text({ text: "{Zdefault}" })
                    ]
                });

                this._oAviTemplateVHDialog.bindAggregation("items", {
                    path: "/AaiTemplateVH",
                    template: oTemplate
                });

                oView.addDependent(this._oAviTemplateVHDialog);
            }

            var oBinding = this._oAviTemplateVHDialog.getBinding("items");
            if (oBinding) {
                oBinding.filter(new Filter({ filters: aMainFilters, and: true }));
            }

            this._oAviTemplateVHDialog.open();
        },

        onAviTemplateVHSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("value") || oEvent.getParameter("query") || "").trim();
            var oUiModel = this._getUiModel();
            var oAvi = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var aFilters = [
                new Filter("Kunnr", FilterOperator.EQ, oAvi.Kunnr || ""),
                new Filter("Vkorg", FilterOperator.EQ, oAvi.Vkorg || ""),
                new Filter("Vtweg", FilterOperator.EQ, oAvi.Vtweg || ""),
                new Filter("Spart", FilterOperator.EQ, oAvi.Spart || "")
            ];

            if (sQuery) {
                aFilters.push(new Filter("Zname", FilterOperator.Contains, sQuery));
            }

            if (this._oAviTemplateVHDialog) {
                var oBinding = this._oAviTemplateVHDialog.getBinding("items");
                if (oBinding) {
                    oBinding.filter(new Filter({ filters: aFilters, and: true }));
                }
            }
        },


        onNonAviQuotation: async function (oEvent, aContexts) {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oUiModel = this._getUiModel();
            var oHeaderContext = oView ? oView.getBindingContext() : null;
            var oHeaderData = oHeaderContext && oHeaderContext.getObject ? (oHeaderContext.getObject() || {}) : {};
            var aSelectedContexts = aContexts || [];

            if (!aSelectedContexts.length) {
                MessageToast.show(this._getText("msgNoDataSelected"));
                return;
            }

            oView.setBusy(true);
            try {
                if (oModel) {
                    var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetDefaultNonAviTemplate(...)");
                    oActionBinding.setParameter("Kunnr", oHeaderData.Customer);
                    oActionBinding.setParameter("Vkorg", oHeaderData.SalesOrg);
                    oActionBinding.setParameter("Vtweg", oHeaderData.DistChannel);
                    oActionBinding.setParameter("Spart", oHeaderData.Division);
                    oActionBinding.setParameter("Zname", "");
                    await oActionBinding.execute();

                    var vActionResult = await this._requestActionResult(oActionBinding);
                    if (vActionResult) {
                        oUiModel.setProperty("/NonAviQuotation", {
                            Vbeln: oHeaderData.Quotation || "",
                            Posnr: oHeaderData.Item || "",
                            Kunnr: oHeaderData.Customer || "",
                            Vkorg: oHeaderData.SalesOrg || "",
                            Vtweg: oHeaderData.DistChannel || "",
                            Spart: oHeaderData.Division || "",
                            Zname: vActionResult.Zname || "",
                            EffectiveFrom: oHeaderData.EffectiveFrom || null,
                            Zremark: vActionResult.Zremark || "",
                            Zterms: vActionResult.Zterms || "",
                            fields: {
                                Zmatnr: vActionResult.Zmatnr || false,
                                ZdescEn: vActionResult.ZdescEn || false,
                                ZdescZh: vActionResult.ZdescZh || false,
                                Zqty: vActionResult.Zqty || false,
                                Zuom: vActionResult.Zuom || false,
                                Zprice: vActionResult.Zprice || false,
                                ZpriceDtl: vActionResult.ZpriceDtl || false,
                                Ztotal: vActionResult.Ztotal || false,
                                Zstorage: vActionResult.Zstorage || false,
                                Zmoq: vActionResult.Zmoq || false,
                                ZshowComp: vActionResult.ZshowComp || false
                            },
                            SelectedRowData: aSelectedContexts.map(function (oCtx) {
                                var oItem = oCtx.getObject ? oCtx.getObject() : {};
                                return {
                                    Vbeln: oItem.Quotation || "",
                                    Posnr: oItem.Item || ""
                                };
                            })
                        });
                    }
                }
                this._openNonAviQuotationDialog();
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                oView.setBusy(false);
            }
        },

        onNonAviQuotationNext: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oNonAvi = oUiModel ? (oUiModel.getProperty("/NonAviQuotation") || {}) : {};
            var oFields = oNonAvi.fields || {};
            var aItems = oNonAvi.SelectedRowData || [];
            var vActionResult;
            var aRootResults;
            var sBusinessError;

            if (!aItems.length) {
                MessageBox.error(this._getText("msgPleaseSelectAtLeastOneItem"));
                return;
            }

            if (!oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            oView.setBusy(true);
            try {
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.PrepareNonAviQuotationData(...)");
                oActionBinding.setParameter("Vbeln", oNonAvi.Vbeln || "");
                oActionBinding.setParameter("Posnr", oNonAvi.Posnr || "");
                oActionBinding.setParameter("Kunnr", oNonAvi.Kunnr || "");
                oActionBinding.setParameter("Vkorg", oNonAvi.Vkorg || "");
                oActionBinding.setParameter("Vtweg", oNonAvi.Vtweg || "");
                oActionBinding.setParameter("Spart", oNonAvi.Spart || "");
                oActionBinding.setParameter("Zmatnr", !!oFields.Zmatnr);
                oActionBinding.setParameter("ZdescEn", !!oFields.ZdescEn);
                oActionBinding.setParameter("ZdescZh", !!oFields.ZdescZh);
                oActionBinding.setParameter("Zuom", !!oFields.Zuom);
                oActionBinding.setParameter("Zqty", !!oFields.Zqty);
                oActionBinding.setParameter("Zprice", !!oFields.Zprice);
                oActionBinding.setParameter("Ztotal", !!oFields.Ztotal);
                oActionBinding.setParameter("Zstorage", !!oFields.Zstorage);
                oActionBinding.setParameter("Zmoq", !!oFields.Zmoq);
                oActionBinding.setParameter("ZshowComp", !!oFields.ZshowComp);
                oActionBinding.setParameter("Items", aItems);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    MessageBox.error(sBusinessError);
                    return;
                }
                var oResult = aRootResults[0] || {};
                if (!oResult || Object.keys(oResult).length === 0) {
                    MessageBox.error(this._getText("msgNoResponseData"));
                    return;
                }
                oUiModel.setProperty("/NonAviPreview", Object.assign({}, oResult, {
                    Vbeln: oNonAvi.Vbeln || "",
                    Posnr: oNonAvi.Posnr || "",
                    Zremark: oNonAvi.Zremark || "",
                    Zterms: oNonAvi.Zterms || "",
                    fields: oFields,
                    Items: oResult.Items || []
                }));

                await this._openNonAviPreviewDialog();
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                oView.setBusy(false);
            }
        },

        onNonAviTemplateVH: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oUiModel = this._getUiModel();
            var oModel = oView ? oView.getModel() : null;
            var oNonAvi = oUiModel ? (oUiModel.getProperty("/NonAviQuotation") || {}) : {};
            var aMainFilters = [];

            if (!oView || !oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (!oNonAvi.Kunnr || !oNonAvi.Vkorg || !oNonAvi.Vtweg || !oNonAvi.Spart) {
                MessageToast.show("Missing Kunnr/Vkorg/Vtweg/Spart");
                return;
            }

            aMainFilters = [
                new Filter("Kunnr", FilterOperator.EQ, oNonAvi.Kunnr),
                new Filter("Vkorg", FilterOperator.EQ, oNonAvi.Vkorg),
                new Filter("Vtweg", FilterOperator.EQ, oNonAvi.Vtweg),
                new Filter("Spart", FilterOperator.EQ, oNonAvi.Spart)
            ];

            if (!this._oNonAviTemplateVHDialog) {
                this._oNonAviTemplateVHDialog = new TableSelectDialog({
                    title: "Select Template",
                    liveChange: this.onNonAviTemplateVHSearch.bind(this),
                    search: this.onNonAviTemplateVHSearch.bind(this),
                    confirm: function (oEvt) {
                        var oItem = oEvt.getParameter("selectedItem");
                        var oCtx = oItem && oItem.getBindingContext();
                        var oObj = oCtx && oCtx.getObject ? oCtx.getObject() : null;
                        if (oObj && oUiModel) {
                            oUiModel.setProperty("/NonAviQuotation/Zname", oObj.Zname || "");
                            var sBase = "/NonAviQuotation/fields/";
                            oUiModel.setProperty(sBase + "Zmatnr", !!oObj.Zmatnr);
                            oUiModel.setProperty(sBase + "ZdescEn", !!oObj.ZdescEn);
                            oUiModel.setProperty(sBase + "ZdescZh", !!oObj.ZdescZh);
                            oUiModel.setProperty(sBase + "Zqty", !!oObj.Zqty);
                            oUiModel.setProperty(sBase + "Zuom", !!oObj.Zuom);
                            oUiModel.setProperty(sBase + "Zprice", !!oObj.Zprice);
                            oUiModel.setProperty(sBase + "Ztotal", !!oObj.Ztotal);
                            oUiModel.setProperty(sBase + "Zstorage", !!oObj.Zstorage);
                            oUiModel.setProperty(sBase + "Zmoq", !!oObj.Zmoq);
                            oUiModel.setProperty(sBase + "ZshowComp", !!oObj.ZshowComp);
                        }
                    }.bind(this),
                    cancel: function () { }
                });

                // Build table columns to show all relevant properties
                var aCols = [
                    // new Column({ header: new Text({ text: "TemplateUUID" }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColCustomer") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColSalesOrg") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDistChannel") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDivision") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColName") }) }),
                    new Column({ header: new Text({ text: this._getText("nonAviTemplateVHColDefault") }) })
                ];

                aCols.forEach(function (c) { this._oNonAviTemplateVHDialog.addColumn(c); }.bind(this));

                var oTemplate = new ColumnListItem({
                    cells: [
                        // new Text({ text: "{TemplateUUID}" }),
                        new Text({ text: "{Kunnr}" }),
                        new Text({ text: "{Vkorg}" }),
                        new Text({ text: "{Vtweg}" }),
                        new Text({ text: "{Spart}" }),
                        new Text({ text: "{Zname}" }),
                        new Text({ text: "{Zdefault}" })
                    ]
                });

                this._oNonAviTemplateVHDialog.bindAggregation("items", {
                    path: "/NonAaiTemplateVH",
                    template: oTemplate
                });

                oView.addDependent(this._oNonAviTemplateVHDialog);
            }

            var oBinding = this._oNonAviTemplateVHDialog.getBinding("items");
            if (oBinding) {
                oBinding.filter(new Filter({ filters: aMainFilters, and: true }));
            }

            this._oNonAviTemplateVHDialog.open();
        },

        onNonAviTemplateVHSearch: function (oEvent) {
            var sQuery = (oEvent.getParameter("value") || oEvent.getParameter("query") || "").trim();
            var oUiModel = this._getUiModel();
            var oNonAvi = oUiModel ? (oUiModel.getProperty("/NonAviQuotation") || {}) : {};
            var aFilters = [
                new Filter("Kunnr", FilterOperator.EQ, oNonAvi.Kunnr || ""),
                new Filter("Vkorg", FilterOperator.EQ, oNonAvi.Vkorg || ""),
                new Filter("Vtweg", FilterOperator.EQ, oNonAvi.Vtweg || ""),
                new Filter("Spart", FilterOperator.EQ, oNonAvi.Spart || "")
            ];

            if (sQuery) {
                aFilters.push(new Filter("Zname", FilterOperator.Contains, sQuery));
            }

            if (this._oNonAviTemplateVHDialog) {
                var oBinding = this._oNonAviTemplateVHDialog.getBinding("items");
                if (oBinding) {
                    oBinding.filter(new Filter({ filters: aFilters, and: true }));
                }
            }
        },
        
         onNonAviPreviewRefresh: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oPreview = oUiModel ? (oUiModel.getProperty("/NonAviPreview") || {}) : {};
            var oNonAvi = oUiModel ? (oUiModel.getProperty("/NonAviQuotation") || {}) : {};
            var oFields = oPreview.fields || {};
            var aItems = oPreview.Items || [];
            var oActionBinding;
            var vActionResult;
            var aRootResults;
            var sBusinessError;

            if (!oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.setBusy) {
                this._oNonAviPreviewDialog.setBusy(true);
            }

            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.PreviewNonAviQuotationPdf(...)");
                oActionBinding.setParameter("Vbeln", oNonAvi.Vbeln);
                oActionBinding.setParameter("Posnr", oNonAvi.Posnr);
                oActionBinding.setParameter("Kunnr", oNonAvi.Kunnr || "");
                oActionBinding.setParameter("Vkorg", oNonAvi.Vkorg || "");
                oActionBinding.setParameter("Vtweg", oNonAvi.Vtweg || "");
                oActionBinding.setParameter("Spart", oNonAvi.Spart || "");
                oActionBinding.setParameter("Zmatnr", !!oFields.Zmatnr);
                oActionBinding.setParameter("ZdescEn", !!oFields.ZdescEn);
                oActionBinding.setParameter("ZdescZh", !!oFields.ZdescZh);
                oActionBinding.setParameter("Zuom", !!oFields.Zuom);
                oActionBinding.setParameter("Zqty", !!oFields.Zqty);
                oActionBinding.setParameter("Zprice", !!oFields.Zprice);
                oActionBinding.setParameter("Ztotal", !!oFields.Ztotal);
                oActionBinding.setParameter("Zstorage", !!oFields.Zstorage);
                oActionBinding.setParameter("Zmoq", !!oFields.Zmoq);
                oActionBinding.setParameter("ZshowComp", !!oFields.ZshowComp);
                oActionBinding.setParameter("CustomerName", oPreview.CustomerName || "");
                oActionBinding.setParameter("ToContact", oPreview.ToContact || "");
                oActionBinding.setParameter("ToTel", oPreview.ToTel || "");
                oActionBinding.setParameter("ToEmail", oPreview.ToEmail || "");
                oActionBinding.setParameter("Re", oPreview.Re || "");
                oActionBinding.setParameter("QuotationDate", oPreview.QuotationDate || "");
                oActionBinding.setParameter("FromContact", oPreview.FromContact || "");
                oActionBinding.setParameter("FromTel", oPreview.FromTel || "");
                oActionBinding.setParameter("FromEmail", oPreview.FromEmail || "");
                oActionBinding.setParameter("Zremark", oPreview.Zremark || "");
                oActionBinding.setParameter("Zterms", oPreview.Zterms || "");
                oActionBinding.setParameter("Items", aItems);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    MessageBox.error(sBusinessError);
                    return;
                }

                var oResult = aRootResults[0] || {};

                if (!oResult.IsSuccess) {
                    MessageBox.error(oResult.Message || this._getText("msgFailedToGenerateNonAviQuotationFile"));
                    return;
                }

                this._openPdfPreview(oView, {
                    form: oResult.FileContent || "",
                    mimetype: oResult.MimeType || "application/pdf",
                    filename: oResult.FileName || "preview.pdf"
                });
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.setBusy) {
                    this._oNonAviPreviewDialog.setBusy(false);
                }
            }
        },

        onNonAviPreviewExportExcel: async function () {
            var oUiModel = this._getUiModel();
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oPreview = oUiModel ? (oUiModel.getProperty("/NonAviPreview") || {}) : {};
            var oNonAvi = oUiModel ? (oUiModel.getProperty("/NonAviQuotation") || {}) : {};
            var oFields = oPreview.fields || {};
            var aItems = oPreview.Items || [];
            var oActionBinding;
            var vActionResult;
            var aRootResults;
            var sBusinessError;

            if (!oModel) {
                MessageBox.error(this._getText("msgModelNotAvailable"));
                return;
            }

            if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.setBusy) {
                this._oNonAviPreviewDialog.setBusy(true);
            }

            try {
                oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GenerateNonAviQuotation(...)");
                oActionBinding.setParameter("Vbeln", oNonAvi.Vbeln);
                oActionBinding.setParameter("Posnr", oNonAvi.Posnr);
                oActionBinding.setParameter("Kunnr", oNonAvi.Kunnr || "");
                oActionBinding.setParameter("Vkorg", oNonAvi.Vkorg || "");
                oActionBinding.setParameter("Vtweg", oNonAvi.Vtweg || "");
                oActionBinding.setParameter("Spart", oNonAvi.Spart || "");
                oActionBinding.setParameter("OutputFormat", "XLSX");
                oActionBinding.setParameter("Zmatnr", !!oFields.Zmatnr);
                oActionBinding.setParameter("ZdescEn", !!oFields.ZdescEn);
                oActionBinding.setParameter("ZdescZh", !!oFields.ZdescZh);
                oActionBinding.setParameter("Zuom", !!oFields.Zuom);
                oActionBinding.setParameter("Zqty", !!oFields.Zqty);
                oActionBinding.setParameter("Zprice", !!oFields.Zprice);
                oActionBinding.setParameter("Ztotal", !!oFields.Ztotal);
                oActionBinding.setParameter("Zstorage", !!oFields.Zstorage);
                oActionBinding.setParameter("Zmoq", !!oFields.Zmoq);
                oActionBinding.setParameter("ZshowComp", !!oFields.ZshowComp);
                oActionBinding.setParameter("CustomerName", oPreview.CustomerName || "");
                oActionBinding.setParameter("ToContact", oPreview.ToContact || "");
                oActionBinding.setParameter("ToTel", oPreview.ToTel || "");
                oActionBinding.setParameter("ToEmail", oPreview.ToEmail || "");
                oActionBinding.setParameter("Re", oPreview.Re || "");
                oActionBinding.setParameter("QuotationDate", oPreview.QuotationDate || "");
                oActionBinding.setParameter("FromContact", oPreview.FromContact || "");
                oActionBinding.setParameter("FromTel", oPreview.FromTel || "");
                oActionBinding.setParameter("FromEmail", oPreview.FromEmail || "");
                oActionBinding.setParameter("Zremark", oPreview.Zremark || "");
                oActionBinding.setParameter("Zterms", oPreview.Zterms || "");
                oActionBinding.setParameter("Items", aItems);
                await oActionBinding.execute();

                vActionResult = await this._requestActionResult(oActionBinding);
                aRootResults = this._normalizeActionResultArray(vActionResult);
                sBusinessError = this._extractActionBusinessError(aRootResults);

                if (sBusinessError) {
                    MessageBox.error(sBusinessError);
                    return;
                }

                var oResult = aRootResults[0] || {};

                if (!oResult.IsSuccess) {
                    MessageBox.error(oResult.Message || this._getText("msgFailedToGenerateNonAviQuotationFile"));
                    return;
                }

                var sFileContent = oResult.FileContent || "";
                var sFileName = oResult.FileName || "quotation.xlsx";
                var sMimeType = oResult.MimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                if (!sFileContent) {
                    MessageToast.show("No file content returned from the server.");
                    return;
                }

                var sBase64 = sFileContent.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
                while (sBase64.length % 4 !== 0) { sBase64 += "="; }
                var sBinary = window.atob(sBase64);
                var oBytes = new Uint8Array(sBinary.length);
                for (var i = 0; i < sBinary.length; i++) {
                    oBytes[i] = sBinary.charCodeAt(i);
                }
                var oBlob = new Blob([oBytes], { type: sMimeType });
                var sObjectUrl = URL.createObjectURL(oBlob);
                var oLink = document.createElement("a");
                oLink.href = sObjectUrl;
                oLink.download = sFileName;
                document.body.appendChild(oLink);
                oLink.click();
                document.body.removeChild(oLink);
                URL.revokeObjectURL(sObjectUrl);

                if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.close) {
                    this._oNonAviPreviewDialog.close();
                }
            } catch (oError) {
                MessageBox.error(this._extractErrorMessage(oError));
            } finally {
                if (this._oNonAviPreviewDialog && this._oNonAviPreviewDialog.setBusy) {
                    this._oNonAviPreviewDialog.setBusy(false);
                }
            }
        },

        _openPdfPreview: function (oView, oData) {
            var oBlob = this._createPdfBlob(oData);

            if (!oBlob) {
                return;
            }

            var sObjectUrl = URL.createObjectURL(oBlob);
            var that = this;
            var oPdfViewer = new PDFViewer({
                width: "100%",
                title: oData.filename || "Preview",
                source: sObjectUrl
            });

            oPdfViewer.attachError(function () {
                MessageBox.error(that._getText("msgPdfLoadFailed") || "Failed to load PDF.");
                URL.revokeObjectURL(sObjectUrl);
                oPdfViewer.destroy();
            });

            oView.addDependent(oPdfViewer);
            Promise.resolve().then(function () {
                oPdfViewer.open();
            });
        },

        _createPdfBlob: function (oData) {
            var sBase64;
            var iPadding;
            var sBinaryString;
            var aBytes;
            var i;

            if (!oData || !oData.form) {
                MessageBox.error(this._getText("msgNoPdfData") || "No PDF data returned.");
                return null;
            }

            sBase64 = typeof oData.form === "string"
                ? oData.form.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "")
                : oData.form;
            iPadding = sBase64.length % 4;

            if (iPadding) {
                sBase64 += "=".repeat(4 - iPadding);
            }

            try {
                sBinaryString = atob(sBase64);
            } catch (oError) {
                MessageBox.error(this._getText("msgInvalidBase64") || "Invalid PDF data.");
                return null;
            }

            aBytes = new Uint8Array(sBinaryString.length);
            for (i = 0; i < sBinaryString.length; i++) {
                aBytes[i] = sBinaryString.charCodeAt(i);
            }

            return new Blob([aBytes], { type: oData.mimetype || "application/pdf" });
        },

        /**
         * Loads BOM data for the selected row and opens the BOM detail dialog.
         */
        onQDViewItem: async function (oEvent) {
            var oView = this.base && this.base.getView ? this.base.getView() : null,
                oModel = oView ? oView.getModel() : null,
                oItemContexts = oEvent.getSource().getBindingContext(),
                oHeaderContext = oEvent.getSource().getParent().getParent().getBindingContext(),
                oCurrentItem = oItemContexts.getObject(),
                oHeader = oHeaderContext.getObject();

            var oActionBinding;
            var aBomItems = [];
            var aPriceHistory = [];
            var aTree;
            var vActionResult;
            var aRootResults;
            var sBusinessError;
            var oRoot;
            var mParams;

            mParams = {
                Material: oCurrentItem.Material,
                SalesOrg: oHeader.SalesOrg,
                DistChannel: oHeader.DistChannel,
                Division: oHeader.Division,
                Customer: oHeader.Customer,
                EffectiveFrom: this._toEdmDateValue(oCurrentItem.ValidFrom)
            };

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
                oView.getModel("ui").setProperty("/bom", {
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
        * Opens the BOM dialog and lazily loads the fragment on first use.
        * @returns {Promise<void>}
        * @private
        */
        _openBomTreeDialog: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;

            if (!oView) {
                return Promise.resolve();
            }

            if (this._oBomTreeDialog) {
                this._oBomTreeDialog.open();
                return Promise.resolve();
            }

            return Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.changequo.ext.fragment.BomTreeView",
                controller: this
            }).then(function (oDialog) {
                this._oBomTreeDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Closes the BOM dialog.
         */
        onCloseBomTreeDialog: function () {
            if (this._oBomTreeDialog && this._oBomTreeDialog.close) {
                this._oBomTreeDialog.close();
            }
        },

        /**
         * Normalizes action results into an array regardless of the binding return shape.
         * @param {*} vResult Raw action result or bound context
         * @returns {object[]}
         * @private
         */
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
         * Requests the concrete action return payload from an OData V4 operation binding.
         * @param {sap.ui.model.odata.v4.ODataContextBinding} oActionBinding Operation binding
         * @returns {Promise<object|object[]|null>}
         * @private
         */
        _requestActionResult: async function (oActionBinding) {
            var oBoundContext = oActionBinding && oActionBinding.getBoundContext && oActionBinding.getBoundContext();

            if (oBoundContext && oBoundContext.requestObject) {
                return oBoundContext.requestObject();
            }

            if (oActionBinding && oActionBinding.requestObject) {
                return oActionBinding.requestObject();
            }

            return null;
        },

        /**
         * Extracts a backend business error message from action root results.
         * @param {object[]} aRootResults Action root records
         * @returns {string}
         * @private
         */
        _extractActionBusinessError: function (aRootResults) {
            var oErrorRoot = (aRootResults || []).find(function (oRoot) {
                var sType = String((oRoot && (oRoot.Type || oRoot.type)) || "").toUpperCase();
                return sType === "E" || sType === "A";
            });

            return oErrorRoot && (oErrorRoot.Mesage || oErrorRoot.Message || oErrorRoot.message) ? (oErrorRoot.Mesage || oErrorRoot.Message || oErrorRoot.message) : "";
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
      * Converts a date value to OData Edm.Date string (YYYY-MM-DD).
      * @param {*} vDate
      * @returns {string|null}
      * @private
      */
        _toEdmDateValue(vDate) {
            if (!vDate) {
                return null;
            }
            if (typeof vDate === "string") {
                // Normalize display formats like "2026/09/18" to ISO "2026-09-18"
                var sNormalized = vDate.trim().replace(/\//g, "-");
                if (/^\d{4}-\d{2}-\d{2}/.test(sNormalized)) {
                    return sNormalized.substring(0, 10);
                }
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
        * Extracts a readable message from framework or business errors.
        * @param {*} oError Error object
        * @returns {string}
        * @private
        */
        _extractErrorMessage: function (oError) {
            if (!oError) { return this._getText("msgOperationFailed"); }

            // Walk cause chain for innermost message
            var oCause = oError;
            while (oCause.cause) { oCause = oCause.cause; }

            // Try to parse OData V4 JSON error body
            var sBody = (oCause.responseText) ||
                (oCause.response && (oCause.response.body || oCause.response.responseText)) || "";
            if (sBody) {
                try {
                    var oBody = JSON.parse(sBody);
                    var oErr = oBody && oBody.error;
                    if (oErr) {
                        // Prefer first detail message (most specific ABAP message)
                        var aDetails = oErr.details || (oErr.innererror && oErr.innererror.errordetails) || [];
                        if (aDetails.length) {
                            return aDetails[0].message || aDetails[0].longtext_url || oErr.message || String(oError);
                        }
                        if (oErr.message) {
                            return typeof oErr.message === "object" ? oErr.message.value : oErr.message;
                        }
                    }
                } catch (e) { /* ignore parse error */ }
            }

            return oCause.message || oError.message || oError.toString() || this._getText("msgOperationFailed");
        },

        /**
         * Returns the shared UI JSONModel.
         * @returns {sap.ui.model.json.JSONModel|null}
         * @private
         */
        _getUiModel: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            return oView ? oView.getModel("ui") : null;
        },

        /**
         * Returns the i18n resource model.
         * @returns {sap.ui.model.resource.ResourceModel|null}
         * @private
         */
        _getI18nModel: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            return oView ? oView.getModel("i18n") : null;
        },

        /**
         * Replaces the standard _Item spreadsheet export with the createquo column layout.
         * Headers follow the active language (en / zh_CN / zh_TW).
         */
        onItemExport: async function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oContext = oView && oView.getBindingContext ? oView.getBindingContext() : null;
            var oModel = oView && oView.getModel ? oView.getModel() : null;
            if (!oView || !oContext || !oModel) {
                MessageToast.show(this._getText("msgNoRowSelected"));
                return;
            }

            BusyIndicator.show(0);
            var oListBinding = null;
            try {
                var aSelect = [
                    "Quotation", "Item", "DeleteFlag", "ComponentID", "LoadingTemplate", "Material",
                    "MaterialType", "MaterialStatus", "BomStatus", "MealType", "Description", "CabinClass",
                    "CostRunDate", "QTStatus", "Sequence", "ItemRemark", "Variant", "YieldedFoodCost", "LabourMM",
                    "LabourRate", "LabourPrice", "Overhead", "Total", "STVariant", "YieldedStandardFoodCost",
                    "MarkUpPercent", "STMarkUp", "STLabourMM", "LabourCostRate", "LabourCost", "SMPLPercent",
                    "SMPLRatio", "LabourMMAdjustment", "AdjustedLabourMM", "LabourMMAdjFix", "LabourSellRate",
                    "STLabourPrice", "STOverHead", "STOverHeadPercent", "AdjustedOverhead", "OtherAdjustment",
                    "STTotal", "SalesPriceFood", "SalesPriceLabour", "SalesPriceOverhead", "TotalSellingPrice",
                    "FreeofCharge", "GrossProfit", "GrossProfitPercent", "NetMargin", "NetMarginPercent",
                    "QuotedPrice", "IncrementPercent", "ProposedNewPrice", "PrecedingQT", "ValidFrom", "ValidTo",
                    "DiffPrevQTPrice", "PrevQT", "PrevQTItem", "PreQTPrice", "PrevQTCost", "Margin", "MarginPercnt",
                    "PrevValidFrom", "PrevValidTo", "Currency"
                ];
                oListBinding = oModel.bindList(oContext.getPath() + "/_Item", null, null, null, {
                    $$ownRequest: true,
                    $select: aSelect.join(",")
                });
                var aContexts = await oListBinding.requestContexts(0, 10000);
                if (!aContexts.length) {
                    MessageToast.show(this._getText("msgNoRowSelected"));
                    return;
                }
                var oHeader = oContext.getObject() || {};
                var aItems = aContexts.map(function (oItemContext) {
                    var oItem = oItemContext.getObject() || {};
                    return {
                        Quotation: oItem.Quotation || oHeader.Quotation || "",
                        QTType: oItem.QTType || oHeader.QTType || "",
                        Item: oItem.Item,
                        DeleteFlag: oItem.DeleteFlag,
                        ComponentID: oItem.ComponentID,
                        SalesOrg: oHeader.SalesOrg || "",
                        DistChannel: oHeader.DistChannel || "",
                        Division: oHeader.Division || "",
                        HeaderDesc: oHeader.HeaderDesc || "",
                        Customer: oHeader.Customer || "",
                        AirlineCode: oHeader.AirlineCode || "",
                        LoadingTempCode: oItem.LoadingTemplate || "",
                        Material: oItem.Material,
                        MaterialType: oItem.MaterialType,
                        MaterialStatus: oItem.MaterialStatus,
                        BomStatus: oItem.BomStatus,
                        MealType: oItem.MealType,
                        Description: oItem.Description,
                        CabinClass: oItem.CabinClass,
                        CostRunDate: oItem.CostRunDate,
                        QTStatus: oItem.QTStatus || "",
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
                        SMPLPercent: oItem.SMPLPercent,
                        SMPLRatio: oItem.SMPLRatio,
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
                        PrecedingQT: oItem.PrecedingQT,
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
                        Message: oItem.Message || ""
                    };
                });
                var XLSX = await this._ensureXlsxLoaded();
                var sLanguage = sap.ui.getCore().getConfiguration().getLanguage();
                var oSheet = QuotationExcel.buildSheet(XLSX, aItems, sLanguage, false);
                QuotationExcel.writeWorkbook(XLSX, oSheet, this._getText("qdExportFileName") + ".xlsx");
            } catch (oError) {
                MessageToast.show(this._getText("msgExportFailed", [this._extractErrorMessage(oError)]));
            } finally {
                if (oListBinding && oListBinding.destroy) {
                    oListBinding.destroy();
                }
                BusyIndicator.hide();
            }
        },

        /**
         * Lazily loads the bundled SheetJS library.
         * @returns {Promise<object>}
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
                oScript.src = sap.ui.require.toUrl("com/cathaydining/zsde005/changequo/lib/xlsx.full.min.js");
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
         * Gets translated text from i18n bundle.
         * @param {string} sKey The i18n key
         * @param {Array} [aArgs] Placeholder values
         * @returns {string}
         * @private
         */
        _getText: function (sKey, aArgs) {
            var oI18nModel = this._getI18nModel();
            if (oI18nModel && oI18nModel.getResourceBundle) {
                return oI18nModel.getResourceBundle().getText(sKey, aArgs);
            }
            return sKey;
        },

        /**
         * Opens the AviQuotation configuration dialog lazily.
         * @returns {Promise<void>}
         * @private
         */
        _openAviQuotationDialog: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            if (!oView) {
                return Promise.resolve();
            }
            if (this._oAviQuotationDialog) {
                this._oAviQuotationDialog.open();
                return Promise.resolve();
            }
            return Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.changequo.ext.fragment.AviQuotation",
                controller: this
            }).then(function (oDialog) {
                this._oAviQuotationDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Opens the Non-Avi Quotation configuration dialog lazily.
         * @returns {Promise<void>}
         * @private
         */
        _openNonAviQuotationDialog: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            if (!oView) {
                return Promise.resolve();
            }
            if (this._oNonAviQuotationDialog) {
                this._oNonAviQuotationDialog.open();
                return Promise.resolve();
            }
            return Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.changequo.ext.fragment.NonAviQuotation",
                controller: this
            }).then(function (oDialog) {
                this._oNonAviQuotationDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Opens the Non-Avi Quotation Preview dialog lazily.
         * @returns {Promise<void>}
         * @private
         */
        _openNonAviPreviewDialog: function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            if (!oView) {
                return Promise.resolve();
            }
            if (this._oNonAviPreviewDialog) {
                this._oNonAviPreviewDialog.open();
                return Promise.resolve();
            }
            return Fragment.load({
                id: oView.getId(),
                name: "com.cathaydining.zsde005.changequo.ext.fragment.NonAviQuotationPreview",
                controller: this
            }).then(function (oDialog) {
                this._oNonAviPreviewDialog = oDialog;
                oView.addDependent(oDialog);
                oDialog.open();
            }.bind(this));
        },

        /**
         * Loads available cabin classes for the AviQuotation dialog.
         * @private
         */
        _loadAviCabinClasses: async function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oUiModel = this._getUiModel();
            var oAvi = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var aItems = oAvi.SelectedRowData || [];

            if (!oModel || !aItems.length) {
                return;
            }

            try {
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetAvailableCabinClasses(...)");
                oActionBinding.setParameter("Vbeln", oAvi.Vbeln || "");
                oActionBinding.setParameter("Items", aItems);
                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aResults = this._normalizeActionResultArray(vActionResult);
                oUiModel.setProperty("/AviQuotation/CabinClassItems", aResults.map(function (oItem) {
                    return { CabinClass: oItem.CabinClass || "" };
                }));
            } catch (oError) {
                // Silently ignore so the dialog still opens even if value help is unavailable.
            }
        },

        /**
         * Loads available cycles for the AviQuotation dialog.
         * @private
         */
        _loadAviCycles: async function () {
            var oView = this.base && this.base.getView ? this.base.getView() : null;
            var oModel = oView ? oView.getModel() : null;
            var oUiModel = this._getUiModel();
            var oAvi = oUiModel ? (oUiModel.getProperty("/AviQuotation") || {}) : {};
            var aItems = oAvi.SelectedRowData || [];

            if (!oModel || !aItems.length) {
                return;
            }

            try {
                var oActionBinding = oModel.bindContext("/ZI_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.GetAvailableCycles(...)");
                oActionBinding.setParameter("Vbeln", oAvi.Vbeln || "");
                oActionBinding.setParameter("Items", aItems);
                await oActionBinding.execute();

                var vActionResult = await this._requestActionResult(oActionBinding);
                var aResults = this._normalizeActionResultArray(vActionResult);
                oUiModel.setProperty("/AviQuotation/CycleItems", aResults.map(function (oItem) {
                    return { Cycle: oItem.Cycle || "" };
                }));
            } catch (oError) {
                // Silently ignore so the dialog still opens even if value help is unavailable.
            }
        }


    });
});
