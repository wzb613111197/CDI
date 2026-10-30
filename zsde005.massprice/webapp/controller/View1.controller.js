sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/BusyDialog",
    "sap/ui/export/EdmType"
], function (Controller, JSONModel, MessageBox, MessageToast, BusyDialog, EdmType) {
    "use strict";


    return Controller.extend("com.cathaydining.zsde005.massprice.controller.View1", {

        _oBusyDialog: null,

        _i18n: function (sKey) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey);
        },

        _i18nf: function (sKey, aArgs) {
            return this.getView().getModel("i18n").getResourceBundle().getText(sKey, aArgs);
        },

        onInit: function () {
            var oModel = new JSONModel({
                items: [],
                uploadEnabled: false
            });
            this.getView().setModel(oModel, "previewModel");
        },

        onTypeMismatch: function () {
            MessageBox.error(this._i18n("msgTypeMismatch"));
        },

        onDownloadTemplate: function () {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            var aColumns = [
                { label: oBundle.getText("colConditionType"), property: "ConditionType", type: EdmType.String },
                { label: oBundle.getText("colCustomer"), property: "Customer", type: EdmType.String },
                { label: oBundle.getText("colSalesOrg"), property: "SalesOrg", type: EdmType.String },
                { label: oBundle.getText("colDistributionChannel"), property: "DistributionChannel", type: EdmType.String },
                { label: oBundle.getText("colDivision"), property: "Division", type: EdmType.String },
                { label: oBundle.getText("colMaterial"), property: "Material", type: EdmType.String },
                { label: oBundle.getText("colAmount"), property: "Amount", type: EdmType.Number },
                { label: oBundle.getText("colUM"), property: "UM", type: EdmType.String },
                { label: oBundle.getText("colValidFrom"), property: "ValidFrom", type: EdmType.Date},
                { label: oBundle.getText("colValidTo"), property: "ValidTo", type: EdmType.Date }
            ];
            const aItems = [];
            sap.ui.require(["sap/ui/export/Spreadsheet"], (Spreadsheet) => {
                const oSettings = {
                    workbook: { columns: aColumns },
                    dataSource: aItems,
                    fileName: "PriceUploadTemplate.xlsx"
                };
                const oSheet = new Spreadsheet(oSettings);
                oSheet.build().finally(() => oSheet.destroy());
            });
        },

         /**
         * Upload button handler – reads the Excel file, parses it via SheetJS, and loads rows into quotation detail.
         */
        onGo() {
            const oFileUploader = this.byId("fileUploader");
            if (!oFileUploader) {
                return;
            }

            const oFileInput = oFileUploader.oFileUpload || document.getElementById(oFileUploader.getId() + "-fu");
            const oFile = oFileInput && oFileInput.files && oFileInput.files[0];
            if (!oFile) {
                MessageBox.error(this._i18n("msgNoFile"));
                return;
            }

            const iStartRow = parseInt(this.byId("readFromRowInput").getValue(), 10) || 2;

            this.getView().setBusy(true);
            this._ensureXlsxLoaded().then(() => {
                const oReader = new FileReader();
                oReader.onload = (e) => {
                    try {
                        const aData = new Uint8Array(e.target.result);
                        this._processExcelData(aData, iStartRow);
                    } catch (oError) {
                        MessageBox.error(this._i18nf("msgParseFailed", [oError.message || oError]));
                        this.getView().setBusy(false);
                    }
                };
                oReader.onerror = () => {
                    MessageBox.error(this._i18n("msgReadFailed"));
                    this.getView().setBusy(false);
                };
                oReader.readAsArrayBuffer(oFile);
            }).catch((oError) => {
                MessageBox.error(this._i18nf("msgUploadFailed", [oError.message || oError]));
                this.getView().setBusy(false);
            });
        },

        /**
         * Processes the Excel binary data into quotation detail items.
         * @param {Uint8Array} aData Excel file binary
         * @private
         */
        _processExcelData(aData, iStartRow) {
            try {
                const XLSX = window.XLSX;
                if (!XLSX) {
                    throw new Error("XLSX library is not available");
                }
                const oWorkbook = XLSX.read(aData, { type: "array", cellDates: true });
                const sFirstSheet = oWorkbook.SheetNames[0];
                const oWSheet = oWorkbook.Sheets[sFirstSheet];

                const aRaw = XLSX.utils.sheet_to_json(oWSheet, {
                    header: 1,
                    defval: "",
                    raw: true
                });

                const aDataRows = aRaw.slice(iStartRow - 1);
                const that = this;

                const aItems = aDataRows
                    .filter((aRow) => aRow.some((cell) => String(cell).trim() !== ""))
                    .map((aRow) => ({
                        ConditionType:       String(aRow[0]  || "").trim(),
                        Customer:            String(aRow[1]  || "").trim(),
                        SalesOrg:            String(aRow[2]  || "").trim(),
                        DistributionChannel: String(aRow[3]  || "").trim(),
                        Division:            String(aRow[4]  || "").trim(),
                        Material:            String(aRow[5]  || "").trim(),
                        Amount:              String(aRow[6]  || "").trim(),
                        UM:                  String(aRow[7]  || "").trim(),
                        ValidFrom:           aRow[8] instanceof Date ? new Date(Date.UTC(aRow[8].getFullYear(), aRow[8].getMonth(), aRow[8].getDate() + 1)) : aRow[8],
                        ValidTo:             aRow[9] instanceof Date ? new Date(Date.UTC(aRow[9].getFullYear(), aRow[9].getMonth(), aRow[9].getDate() + 1)) : aRow[9],
                        Type:                "",
                        Message:             ""
                    }));

                const oPreviewModel = this.getView().getModel("previewModel");
                oPreviewModel.setProperty("/items", aItems);
                oPreviewModel.setProperty("/uploadEnabled", aItems.length > 0);

                MessageToast.show(this._i18nf("msgRecordsLoaded", [aItems.length]));

                if (aItems.length > 0) {
                    this._executeUpload(aItems,true);
                }
            } catch (oError) {
                MessageBox.error(this._i18nf("msgParseFailed", [oError.message || oError]));
            } finally {
                this.getView().setBusy(false);
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
                oScript.src = sap.ui.require.toUrl("com/cathaydining/zsde005/massprice/lib/xlsx.full.min.js");
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

        onUpload: function () {
            const oPreviewModel = this.getView().getModel("previewModel");
            const aItems = oPreviewModel.getProperty("/items");

            if (!aItems || aItems.length === 0) {
                MessageBox.error(this._i18n("msgNoData"));
                return;
            }

            const that = this;
            MessageBox.confirm(
                this._i18nf("msgConfirmUpload", [aItems.length]),
                {
                    title: this._i18n("msgConfirmTitle"),
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            that._executeUpload(aItems,false);
                        }
                    }
                }
            );
        },

        _executeUpload: function (aItems,Precheck) {
            const that = this;
            const oODataModel = this.getView().getModel();

            if (!Precheck && aItems.some((o) => o.Type === "E")) {
                MessageBox.error(this._i18n("msgUploadWithErrors"));
                return;
            }

            if (!this._oBusyDialog) {
                this._oBusyDialog = new BusyDialog({ text: this._i18n("msgUploading") });
            }
            this._oBusyDialog.open();

            const aActionItems = aItems.map((oItem) => ({
                ConditionType:       oItem.ConditionType,
                Customer:            oItem.Customer,
                SalesOrg:            oItem.SalesOrg,
                DistributionChannel: oItem.DistributionChannel,
                Division:            oItem.Division,
                Material:            oItem.Material,
                Amount:              oItem.Amount,
                UM:                  oItem.UM,
                ValidFrom:           oItem.ValidFrom instanceof Date
                    ? oItem.ValidFrom.getUTCFullYear() + "-" + String(oItem.ValidFrom.getUTCMonth() + 1).padStart(2, "0") + "-" + String(oItem.ValidFrom.getUTCDate()).padStart(2, "0")
                    : (oItem.ValidFrom || null),
                ValidTo:             oItem.ValidTo instanceof Date
                    ? oItem.ValidTo.getUTCFullYear() + "-" + String(oItem.ValidTo.getUTCMonth() + 1).padStart(2, "0") + "-" + String(oItem.ValidTo.getUTCDate()).padStart(2, "0")
                    : (oItem.ValidTo || null),
                Type:                "",
                Message:             ""
            }));
            const oOperation = oODataModel.bindContext("/ZC_SD_QT_LOAD_TEMP/com.sap.gateway.srvd.zsd_sd_qt_load_temp.v0001.UploadPrice(...)");
            oOperation.setParameter("Precheck", Precheck);
            oOperation.setParameter("Type", '');
            oOperation.setParameter("Message", '');
            oOperation.setParameter("_price", aActionItems);

            oOperation.execute()
                .then(function () {
                    that._oBusyDialog.close();
                    const oCtx = oOperation.getBoundContext();
                    const oResult = oCtx ? oCtx.getObject() : null;
                    const aResult = oResult && Array.isArray(oResult.value) ? oResult.value
                                  : Array.isArray(oResult) ? oResult : null;
                
                    const aResultItems = (aResult[0]._price || []).map((oItem) => {
                        return Object.assign({}, oItem, {
                            ValidFrom: oItem.ValidFrom ? new Date(oItem.ValidFrom) : null,
                            ValidTo:   oItem.ValidTo   ? new Date(oItem.ValidTo)   : null
                        });
                    });

                    const oPreviewModel = that.getView().getModel("previewModel");
                    oPreviewModel.setProperty("/items", aResultItems);
                })
                .catch(function (oError) {
                    that._oBusyDialog.close();
                    const sMsg = oError && oError.message ? oError.message : JSON.stringify(oError);
                    MessageBox.error(that._i18nf("msgUploadFailed", [sMsg]));
                });
        },

        onExit: function () {
            if (this._oBusyDialog) {
                this._oBusyDialog.destroy();
                this._oBusyDialog = null;
            }
        }
    });
});