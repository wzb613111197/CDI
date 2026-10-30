sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
	'sap/m/ColumnListItem',
	'sap/m/Label',
	'sap/m/Text',
	'sap/m/Column',
	'sap/m/Table',
	'sap/m/SearchField',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/Token'
], function (ControllerExtension, MessageBox, MessageToast, JSONModel, Fragment,
	ColumnListItem, Label, Text, Column, Table, SearchField, Filter, FilterOperator, Dialog, Button, Token) {
	'use strict';

	var ACTION_NAME = 'com.sap.gateway.srvd.zsd_pp_manage_shopfloor_label.v0001.Print(...)';
	var KEY_PROPERTIES = [
		'ProductionOrder',
		'Material',
		'SplitOrderNumber',
		'SplitBatchNumber',
		'ItemNo',
		'GalleyStandard'
	];

	return ControllerExtension.extend('com.cathaydining.zppf014.ext.controller.ListReportExtension', {
		override: {
			onInit: function () {
				this._mEditedCopies = {};
				this._mEditedPrinters = {};
				this._oPrintModel = new JSONModel({
					numberMode: '01',
					numberOfLabels: '1',
					contexts: []
				});
				this.base.getView().setModel(this._oPrintModel, 'print');
			},

			onExit: function () {
				if (this._oPrintDialog) {
					this._oPrintDialog.destroy();
					this._oPrintDialog = null;
				}
				if (this._oPrinterVHDialog) {
					this._oPrinterVHDialog.destroy();
					this._oPrinterVHDialog = null;
				}
			}
		},

		// FE V4: wired via tableSettings.beforeRebindTable (not V2 onBeforeRebindTableExtension)
		onBeforeRebindTable: function () {
			// Keep this handler exception-safe — errors here prevent the app from opening.
			try {
				this._mEditedCopies = {};
				this._mEditedPrinters = {};
				var that = this;
				var fnReset = function () {
					try {
						that._resetVisibleCopyInputs();
					} catch (e) {
						// ignore UI reset errors
					}
				};
				setTimeout(fnReset, 0);
				// Second pass after OData response paints rows
				setTimeout(fnReset, 400);
			} catch (e) {
				// ignore
			}
		},

		_resetVisibleCopyInputs: function () {
			var fnMatch = function (oControl) {
				return oControl
					&& oControl.isA
					&& oControl.isA('sap.m.Input')
					&& oControl.getId
					&& oControl.getId().indexOf('inputPrintCopies') !== -1;
			};
			var fnApply = function (oInput) {
				var oContext = oInput.getBindingContext();
				var vValue = oContext ? oContext.getProperty('NumberofLabels') : null;
				oInput.setValue(vValue != null && vValue !== '' ? String(vValue) : '1');
			};

			var aInputs = [];
			var oView = this.base.getView();
			if (oView && oView.findAggregatedObjects) {
				aInputs = oView.findAggregatedObjects(true, fnMatch) || [];
			}
			// GridTable cells may live outside the LR view tree — fall back to registry
			if ((!aInputs || !aInputs.length) && sap.ui.require) {
				var Element = sap.ui.require('sap/ui/core/Element');
				if (Element && Element.registry && Element.registry.filter) {
					aInputs = Element.registry.filter(fnMatch) || [];
				}
			}
			aInputs.forEach(fnApply);
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

		onCopiesChange: function (oEvent) {
			var oInput = oEvent.getSource();
			var oContext = oInput.getBindingContext();
			if (!oContext) {
				return;
			}
			var sValue = oEvent.getParameter('value');
			if (sValue === undefined || sValue === null) {
				sValue = oInput.getValue();
			}
			this._mEditedCopies[this._getContextKey(oContext)] = sValue;
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
			var sKey = this._getRowKey(oMultiInput);
			var sValue = this._getTokensValue(oMultiInput);
			this._mEditedPrinters[sKey] = sValue;
		},

		onPrinterManualInput: function (oEvent) {
			var oMultiInput = oEvent.getSource();
			var sValue = (oMultiInput.getValue() || '').trim();
			if (!sValue) {
				return;
			}
			var sKey = this._getRowKey(oMultiInput);
			if (!sKey) {
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
			this._mEditedPrinters[sKey] = sPrinter;
		},

		onCopiesContextChange: function (oEvent) {
			var oInput = oEvent.getSource();
			var oContext = oInput.getBindingContext();
			if (!oContext) {
				oInput.setValue('');
				return;
			}
			// Binding context key — CustomData is stale while GridTable recycles rows
			var sKey = this._getContextKey(oContext);
			var vValue = this._mEditedCopies[sKey] != null
				? this._mEditedCopies[sKey]
				: oContext.getProperty('NumberofLabels');
			oInput.setValue(vValue != null && vValue !== '' ? String(vValue) : '1');
		},

		onPrinterContextChange: function (oEvent) {
			var oMultiInput = oEvent.getSource();
			var oContext = oMultiInput.getBindingContext();
			if (!oContext) {
				oMultiInput.removeAllTokens();
				return;
			}
			var sKey = this._getContextKey(oContext);
			if (this._mEditedPrinters[sKey] != null) {
				this._setTokensFromString(oMultiInput, this._mEditedPrinters[sKey]);
				return;
			}
			var that = this;
			oContext.requestProperty('ZPrint').then(function (sValue) {
				sValue = sValue || '';
				that._setTokensFromString(oMultiInput, sValue);
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
				var sKey = this._getRowKey(this._oPrinterVHSource);
				this._setTokensFromString(this._oPrinterVHSource, sValue);
				this._mEditedPrinters[sKey] = sValue;
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

		onOpenPrintDialog: async function (oEvent, aContexts) {
			var oExtensionAPI = this.base.getExtensionAPI();
			var aSelectedContexts = (aContexts && aContexts.length) ? aContexts : oExtensionAPI.getSelectedContexts();

			if (!aSelectedContexts || !aSelectedContexts.length) {
				MessageBox.warning(this._getText('msgSelectItem'));
				return;
			}

			// Check every selected row has a Printer value
			var aMissing = [];
			for (var i = 0; i < aSelectedContexts.length; i++) {
				var sKey = this._getContextKey(aSelectedContexts[i]);
				var sPrinterVal = this._mEditedPrinters[sKey] || aSelectedContexts[i].getProperty('ZPrint') || '';
				if (!sPrinterVal) {
					aMissing.push(aSelectedContexts[i].getProperty('ProductionOrder'));
				}
			}
			if (aMissing.length) {
				MessageBox.warning(this._getText('msgEnterPrinter', [aMissing.join(', ')]));
				return;
			}

			if (!this._oPrintDialog) {
				this._oPrintDialog = await Fragment.load({
					id: this.base.getView().getId(),
					name: 'com.cathaydining.zppf014.ext.fragment.PrintDialog',
					controller: this
				});
				this.base.getView().addDependent(this._oPrintDialog);
			}

			this._oPrintModel.setProperty('/numberMode', '01');
			this._oPrintModel.setProperty('/numberOfLabels', '1');
			this._oPrintModel.setProperty('/contexts', aSelectedContexts);
			this._oPrintDialog.open();
		},

		onCloseDialog: function () {
			if (this._oPrintDialog) {
				this._oPrintDialog.close();
			}
		},

		onConfirmPrint: function () {
			var sFragmentId = this.base.getView().getId();
			var oMassInput = Fragment.byId(sFragmentId, 'massCopiesInput');

			var sNumberMode = this._oPrintModel.getProperty('/numberMode');
			var iMassLabels = parseInt(oMassInput ? oMassInput.getValue() : '', 10);
			if (sNumberMode === '02' && (isNaN(iMassLabels) || iMassLabels <= 0)) {
				MessageBox.warning(this._getText('msgEnterCopies'));
				return;
			}

			var aContexts = this._oPrintModel.getProperty('/contexts') || [];
			var oView = this.base.getView();
			var oModel = oView.getModel();
			var that = this;

			oView.setBusy(true);
			this.onCloseDialog();

			// Single batch call for all selected contexts
			var sGroupId = 'Print' + Date.now();
			var aPromises = [];

			aContexts.forEach(function (oContext) {
				var sPrinter = that._mEditedPrinters[that._getContextKey(oContext)] || oContext.getProperty('ZPrint') || '';
				var iLabels;
				if (sNumberMode === '01') {
					var sEditedLabels = that._mEditedCopies[that._getContextKey(oContext)];
					iLabels = parseInt(sEditedLabels || oContext.getProperty('NumberofLabels') || '', 10);
					if (isNaN(iLabels) || iLabels <= 0) {
						iLabels = 1;
					}
				} else {
					iLabels = iMassLabels;
				}
				var oOperation = oModel.bindContext(ACTION_NAME, oContext, {
					$$groupId: sGroupId
				});
				oOperation.setParameter('PrintPage', iLabels);
				oOperation.setParameter('Printer', sPrinter);
				aPromises.push(oOperation.execute(sGroupId));
			});

			oModel.submitBatch(sGroupId);

			Promise.allSettled(aPromises).then(function (aResults) {
				oView.setBusy(false);
				var iSuccess = 0;
				var aErrors = [];
				aResults.forEach(function (oResult, i) {
					if (oResult.status === 'fulfilled') {
						iSuccess++;
					} else {
						var sOrder = aContexts[i].getProperty('ProductionOrder') || '';
						aErrors.push(sOrder + ': ' + ((oResult.reason && oResult.reason.message) || that._getText('msgPrintFailed')));
					}
				});
				if (aErrors.length) {
					MessageBox.error(
						that._getText('msgPrintPartial', [iSuccess, aResults.length, aErrors.join('\n')])
					);
				} else {
					MessageToast.show(that._getText('msgPrintStarted'));
				}
			});
		},

		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}
	});
});
