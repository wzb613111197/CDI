sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/m/ColumnListItem",
    "sap/m/Label",
    "sap/m/Text",
    "sap/m/Column",
    "sap/m/Table",
    "sap/m/SearchField",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Token"
], function (ControllerExtension, MessageToast, MessageBox, BusyIndicator,
    ColumnListItem, Label, Text, Column, Table, SearchField,
    Filter, FilterOperator, Dialog, Button, Token) {
    'use strict';

    var ACTION_NAME = 'com.sap.gateway.srvd.zsd_pp_top_up_label_o4.v0001.Print(...)';
    var KEY_PROPERTIES = ['Bktxt', 'MjahrKey', 'MblnrKey', 'ZeileKey', 'Zcnno', 'Werks'];

    return ControllerExtension.extend("com.cathaydining.zppf010.ext.controller.ListReportExtension", {
        override: {
            onInit: function () {
                this._mEditedPrinters = {};
                this.getView().attachAfterRendering(this._onAfterViewRendering, this);
            },

            onExit: function () {
                if (this._oPrinterVHDialog) {
                    this._oPrinterVHDialog.destroy();
                    this._oPrinterVHDialog = null;
                }
            }
        },

        _onAfterViewRendering: function () {
            this.getView().detachAfterRendering(this._onAfterViewRendering, this);
            var oIconTabBar = this.getView().byId("fe::TabMultipleMode");
            if (oIconTabBar) {
                oIconTabBar.attachSelect(this._onTabSelect, this);
                this._setFilterBarVisible(oIconTabBar.getSelectedKey() === "fe::table::tableView::LineItem");
            }
        },

        _onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this._setFilterBarVisible(sKey === "fe::table::tableView::LineItem");
        },

        _setFilterBarVisible: function (bVisible) {
            var oFilterBar = this.getView().byId("fe::FilterBar::zc_pp_top_up_label");
            if (oFilterBar) {
                oFilterBar.setVisible(bVisible);
            }
        },

        onBarcodeScanSuccess: function (oEvent) {
            var sText = oEvent.getParameter("text");
            if (!sText) { return; }
            // BarcodeScannerButton is HBox items[1], Input is items[0]
            var oInput = oEvent.getSource().getParent().getItems()[0];
            oInput.setValue(sText);
            this._callAction(sText, oInput);
        },

        onBarcodeScanFail: function (oEvent) {
            var sMsg = oEvent.getParameter("message");
            if (sMsg && sMsg !== "canceled") {
                MessageToast.show(sMsg);
            }
        },

        onMaterialDocumentChange: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            if (sValue) {
                this._callAction(sValue, oEvent.getSource());
            }
        },

        _callAction: async function (sMblnr, oControl) {
            var oModel = oControl.getModel();
            BusyIndicator.show(0);
            try {
                var oActionBinding = oModel.bindContext(
                    "/zc_pp_top_up_label/com.sap.gateway.srvd.zsd_pp_top_up_label_o4.v0001.Scan(...)"
                );
                oActionBinding.setParameter("MaterialDocumentNumber", sMblnr);
                await oActionBinding.execute();
                MessageToast.show("Success");
            } catch (oError) {
                var sMsg = (oError.cause && oError.cause.message)
                    || (oError.error && oError.error.message)
                    || oError.message
                    || "Action failed";
                console.error("Scan action error:", oError);
                MessageBox.error(sMsg);
            } finally {
                BusyIndicator.hide();
            }
        },

        _getRowKey: function (oSource) {
            return KEY_PROPERTIES.map(function (sProp) {
                return oSource.data(sProp) || '';
            }).join('|');
        },

        _getContextKey: function (oContext) {
            return KEY_PROPERTIES.map(function (sProp) {
                return oContext.getProperty(sProp) || '';
            }).join('|');
        },

        onPrinterTokenUpdate: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var sType = oEvent.getParameter('type');
            if (sType === 'removed') {
                var aRemoved = oEvent.getParameter('removedTokens') || [];
                aRemoved.forEach(function (oToken) {
                    oMultiInput.removeToken(oToken);
                });
            }
            var sZcnno = oMultiInput.data('Zcnno');
            var sValue = this._getTokensValue(oMultiInput);
            this._mEditedPrinters[sZcnno] = sValue;
            this._syncPrinterInputs(sZcnno, oMultiInput);
        },

        onPrinterManualInput: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var sValue = (oMultiInput.getValue() || '').trim();
            if (!sValue) {
                return;
            }
            var sZcnno = oMultiInput.data('Zcnno') || '';
            if (!sZcnno) {
                var oCtx = oMultiInput.getBindingContext();
                sZcnno = oCtx ? oCtx.getProperty('Zcnno') || '' : '';
            }
            if (!sZcnno) {
                return;
            }
            var aTokens = oMultiInput.getTokens();
            var bExists = aTokens.some(function (oToken) {
                return oToken.getKey() === sValue;
            });
            if (!bExists) {
                oMultiInput.addToken(new Token({ key: sValue, text: sValue }));
            }
            oMultiInput.setValue('');
            var sPrinter = this._getTokensValue(oMultiInput);
            this._mEditedPrinters[sZcnno] = sPrinter;
            this._syncPrinterInputs(sZcnno, oMultiInput);
        },

        onPrinterContextChange: function (oEvent) {
            var oMultiInput = oEvent.getSource();
            var oContext = oMultiInput.getBindingContext();
            if (!oContext) {
                oMultiInput.removeAllTokens();
                return;
            }
            var sZcnno = oContext.getProperty('Zcnno');
            if (this._mEditedPrinters[sZcnno] != null) {
                this._setTokensFromString(oMultiInput, this._mEditedPrinters[sZcnno]);
                return;
            }
            var that = this;
            oContext.requestProperty('ZPrint').then(function (sValue) {
                if (that._mEditedPrinters[sZcnno] != null) {
                    sValue = that._mEditedPrinters[sZcnno];
                } else {
                    sValue = sValue || '';
                    if (sValue) {
                        that._mEditedPrinters[sZcnno] = sValue;
                    }
                }
                that._setTokensFromString(oMultiInput, sValue);
                that._syncPrinterInputs(sZcnno, oMultiInput);
            });
        },

        onPrinterValueHelp: function (oEvent) {
            this._oPrinterVHSource = oEvent.getSource();
            var oView = this.base.getView();

            if (!this._oPrinterVHDialog) {
                this._oPrinterVHTable = new Table({
                    mode: 'MultiSelect',
                    columns: [
                        new Column({ header: new Label({ text: 'Printer' }) }),
                        new Column({ header: new Label({ text: 'Device Type' }) }),
                        new Column({ header: new Label({ text: 'Location' }) })
                    ],
                    items: {
                        path: '/PrinterVH',
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: '{Printer}' }),
                                new Text({ text: '{DeviceTypName}' }),
                                new Text({ text: '{Name}' })
                            ]
                        })
                    }
                });
                this._oPrinterVHDialog = new Dialog({
                    title: this._getText('SelectPrinter'),
                    contentWidth: '28rem',
                    content: [
                        new SearchField({
                            liveChange: this._onPrinterVHSearch.bind(this)
                        }),
                        this._oPrinterVHTable
                    ],
                    beginButton: new Button({
                        text: this._getText('Confirm'),
                        type: 'Emphasized',
                        press: this._onPrinterVHConfirm.bind(this)
                    }),
                    endButton: new Button({
                        text: this._getText('Close'),
                        press: function () {
                            this._oPrinterVHDialog.close();
                        }.bind(this)
                    })
                });
                oView.addDependent(this._oPrinterVHDialog);
            }

            this._oPrinterVHDialog.open();
            this._preselectPrinters();
        },

        _onPrinterVHSearch: function (oEvent) {
            var sValue = oEvent.getParameter('newValue');
            var oTable = this._oPrinterVHDialog.getContent()[1];
            var oBinding = oTable.getBinding('items');
            if (sValue) {
                oBinding.filter([
                    new Filter({
                        filters: [
                            new Filter('Printer', FilterOperator.Contains, sValue),
                            new Filter('DeviceTypName', FilterOperator.Contains, sValue),
                            new Filter('Name', FilterOperator.Contains, sValue)
                        ],
                        and: false
                    })
                ]);
            } else {
                oBinding.filter([]);
            }
        },

        _onPrinterVHConfirm: function () {
            var aSelectedItems = this._oPrinterVHTable.getSelectedItems();
            var aPrinters = aSelectedItems.map(function (oItem) {
                return oItem.getBindingContext().getProperty('Printer');
            });
            var sValue = aPrinters.join(';');
            if (this._oPrinterVHSource) {
                var sZcnno = this._oPrinterVHSource.data('Zcnno');
                this._setTokensFromString(this._oPrinterVHSource, sValue);
                this._mEditedPrinters[sZcnno] = sValue;
                this._syncPrinterInputs(sZcnno, this._oPrinterVHSource);
            }
            this._oPrinterVHDialog.close();
        },

        _preselectPrinters: function () {
            var oTable = this._oPrinterVHTable;
            var sCurrentValue = this._oPrinterVHSource ? this._getTokensValue(this._oPrinterVHSource) : '';
            var aCurrentPrinters = sCurrentValue ? sCurrentValue.split(';') : [];

            oTable.removeSelections(true);

            var fnSelect = function () {
                var aItems = oTable.getItems();
                aItems.forEach(function (oItem) {
                    var oCtx = oItem.getBindingContext();
                    if (oCtx && aCurrentPrinters.indexOf(oCtx.getProperty('Printer')) >= 0) {
                        oTable.setSelectedItem(oItem, true);
                    }
                });
            };

            if (oTable.getItems().length > 0) {
                fnSelect();
            } else {
                oTable.attachEventOnce('updateFinished', fnSelect);
            }
        },

        _getTokensValue: function (oMultiInput) {
            return oMultiInput.getTokens().map(function (oToken) {
                return oToken.getKey();
            }).join(';');
        },

        _setTokensFromString: function (oMultiInput, sValue) {
            oMultiInput.removeAllTokens();
            if (sValue) {
                sValue.split(';').forEach(function (sPrinter) {
                    if (sPrinter) {
                        oMultiInput.addToken(new Token({ key: sPrinter, text: sPrinter }));
                    }
                });
            }
        },

        _syncPrinterInputs: function (sZcnno, oExclude) {
            var that = this;
            var sValue = this._mEditedPrinters[sZcnno] || '';
            var oView = this.base.getView();
            oView.findAggregatedObjects(true, function (oControl) {
                return oControl !== oExclude &&
                    oControl.isA('sap.m.MultiInput') &&
                    oControl.data('Zcnno') === sZcnno;
            }).forEach(function (oMultiInput) {
                that._setTokensFromString(oMultiInput, sValue);
            });
        },

        onPrint: function (oEvent, aContexts) {
            var oExtensionAPI = this.base.getExtensionAPI();
            var aSelectedContexts = (aContexts && aContexts.length) ? aContexts : oExtensionAPI.getSelectedContexts();

            if (!aSelectedContexts || !aSelectedContexts.length) {
                MessageBox.warning(this._getText('msgSelectItem'));
                return;
            }

            var that = this;
            var aItems = aSelectedContexts.map(function (oContext) {
                var sZcnno = oContext.getProperty('Zcnno') || '';
                return {
                    Bktxt: oContext.getProperty('Bktxt') || '',
                    MjahrKey: oContext.getProperty('MjahrKey') || '',
                    MblnrKey: oContext.getProperty('MblnrKey') || '',
                    ZeileKey: oContext.getProperty('ZeileKey') || '',
                    Zcnno: sZcnno,
                    Werks: oContext.getProperty('Werks') || '',
                    Printer: that._mEditedPrinters[sZcnno] || oContext.getProperty('ZPrint') || ''
                };
            });

            var aMissing = aItems.filter(function (oItem) {
                return !oItem.Printer;
            }).map(function (oItem) {
                return oItem.MblnrKey || oItem.Zcnno;
            });
            if (aMissing.length) {
                MessageBox.warning(this._getText('msgEnterPrinter', [aMissing.join(', ')]));
                return;
            }

            var oView = this.base.getView();
            var oModel = oView.getModel();

            oView.setBusy(true);

            var sGroupId = 'printGroup';
            var aPromises = aSelectedContexts.map(function (oContext, iIndex) {
                var oOperation = oModel.bindContext(ACTION_NAME, oContext, {
                    $$groupId: sGroupId
                });
                oOperation.setParameter('Printer', aItems[iIndex].Printer);
                oOperation.setParameter('Items', [aItems[iIndex]]);
                return oOperation.execute(sGroupId);
            });

            oModel.submitBatch(sGroupId);

            Promise.all(aPromises).then(function () {
                oView.setBusy(false);
                MessageToast.show(that._getText('msgPrintStarted'));
            }).catch(function (oError) {
                oView.setBusy(false);
                MessageBox.error((oError && oError.message) || that._getText('msgPrintFailed'));
            });
        },

        _getText: function (sKey, aArgs) {
            var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
            return oBundle.getText(sKey, aArgs);
        }

    });
});
