sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/ui/core/Fragment',
	'sap/ui/model/json/JSONModel',
	'sap/m/library',
	'sap/ui/core/BusyIndicator',
	'sap/m/SelectDialog',
	'sap/m/StandardListItem',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	'sap/ui/model/odata/v4/ODataModel'
], function (ControllerExtension, MessageBox, MessageToast, Fragment, JSONModel, mobileLibrary, BusyIndicator,
	SelectDialog, StandardListItem, Filter, FilterOperator, ODataModelV4) {
	'use strict';

	var ValueState = mobileLibrary.ValueState;

	return ControllerExtension.extend('com.cathaydining.zppf012.ext.controller.ListReportExtension', {
		onInit: function () {
			var oView = this.getView();
			var oResModel = oView && oView.getModel ? oView.getModel('i18n') : null;
			this._oResourceBundle = oResModel ? oResModel.getResourceBundle() : null;
		},

		onPrint: function () {
			this._ensurePrintModel();
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();
			if (!aContexts.length) {
				MessageBox.error(this._getText('messageSelectRows'));
				return;
			}

			var aItems = aContexts.map(function (oContext) {
				var oObject = oContext.getObject() || {};
				var oItemData = {
					ProductionOrder: oObject.ProductionOrder || '',
					MaterialCode: oObject.MaterialCode || '',
					MaterialDescription: oObject.MaterialDescription || '',
					Plant: oObject.Plant || '',
					Zfevor: oObject.Zfevor || '',
					Arbpl: oObject.Arbpl || '',
					ProdOrderBasedQuantity: Math.trunc(Number(oObject.ProdOrderBasedQuantity) || 0),
					NumberOfLabels: oObject.Numberoflabels || 0,
					ProdOrderUnit: oObject.ProdOrderUnit,
					DishLabelPrint: oObject.ZDishLabelPrint || ''
				};
				var sDishLabel = oItemData.DishLabelPrint;
				oItemData.DishLabelPrintTokens = sDishLabel ? sDishLabel.split(';').map(function (s) {
					var sTrimmed = s.trim();
					return { key: sTrimmed, text: sTrimmed };
				}) : [];
				return oItemData;
			});

			var aGroupedItems = this._groupItemsByMaterialCode(aItems);
			this._oPrintModel.setProperty('/printError', false);
			this._oPrintModel.setProperty('/groups', aGroupedItems);
			this._refreshDisplayItems(false);
			this._refreshPrintTotals();
			this._openPrintDialog();
		},

		onNumberChange: function (oEvent) {
			var oInput = oEvent.getSource();
			var oContext = oInput.getBindingContext('print');
			if (!oContext) {
				return;
			}

			var iValue = this._normalizeLabelCount(oInput.getValue());
			if (iValue === null) {
				MessageToast.show(this._getText('messageInvalidLabelCount'));
				return;
			}

			var oRowData = oContext.getObject();
			if (!oRowData || oRowData.RowType !== 'Item') {
				return;
			}

			var iGroupIndex = oRowData.GroupIndex;
			var iItemIndex = oRowData.ItemIndex;
			var sGroupPath = '/groups/' + iGroupIndex;

			// Update source-of-truth in /groups
			this._oPrintModel.setProperty(sGroupPath + '/items/' + iItemIndex + '/NumberOfLabels', iValue);

			// Recalculate and persist group subtotal
			var aGroupItems = this._oPrintModel.getProperty(sGroupPath + '/items') || [];
			var iNewSubtotal = aGroupItems.reduce(function (iSum, oItem) {
				return iSum + (Number(oItem.NumberOfLabels) || 0);
			}, 0);
			this._oPrintModel.setProperty(sGroupPath + '/subtotalLabels', iNewSubtotal);

			// Rebuild /items so sap.ui.table.Table re-renders with updated values
			this._refreshDisplayItems();
			this._refreshPrintTotals();
		},

		onPrintTableRowsUpdated: function () {
			var oView = this.base && this.base.getView ? this.base.getView() : this.getView();
			var oTable = oView.byId("printTable");
			if (!oTable) {
				return;
			}
			setTimeout(function () {
				var aRows = oTable.getRows();
				for (var i = 0; i < aRows.length; i++) {
					var oCtx = aRows[i].getBindingContext("print");
					var bGroup = oCtx && oCtx.getProperty("RowType") === "Group";
					var sColor = bGroup ? "#e7f4fc" : "";
					var oDOM = aRows[i].getDomRef();
					if (oDOM) {
						var aCells = oDOM.querySelectorAll("td");
						for (var j = 0; j < aCells.length; j++) {
							aCells[j].style.backgroundColor = sColor;
						}
					}
				}
			}, 0);
		},

		onPrinterValueHelp: function (oEvent) {
			var oView = this.base && this.base.getView ? this.base.getView() : null;
			var oModel = oView ? oView.getModel() : null;
			var oRowCtx = oEvent.getSource().getBindingContext("print");
			this._activePrintPath = oRowCtx.getPath();

			if (!this._oPrinterVHDialog) {
				this._oPrinterVHDialog = new SelectDialog({
					title: this._getText('labelPrinterVH'),
					multiSelect: true,
					confirm: function (oEvent) {
						var aSelectedItems = oEvent.getParameter('selectedItems') || [];
						if (aSelectedItems.length) {
							var aTokens = aSelectedItems.map(function (oItem) {
								return { key: oItem.getTitle(), text: oItem.getTitle() };
							});
							var sJoined = aTokens.map(function (t) { return t.text; }).join(';');
							this._oPrintModel.setProperty(this._activePrintPath + '/DishLabelPrint', sJoined);
							this._oPrintModel.setProperty(this._activePrintPath + '/DishLabelPrintTokens', aTokens);
						}
					}.bind(this),
					search: function (oEvent) {
						var sValue = oEvent.getParameter('value');
						var oFilter = sValue
							? new Filter({
								filters: [
									new Filter('Printer', FilterOperator.Contains, sValue),
									new Filter('Name', FilterOperator.Contains, sValue)
								],
								and: false
							})
							: null;
						oEvent.getSource().getBinding('items').filter(oFilter ? [oFilter] : []);
					},
					items: {
						path: '/ZI_EWM_PRINTER_VH',
						template: new StandardListItem({
							title: '{Printer}',
							description: '{Name}'
						})
					}
				});
				this._oPrinterVHDialog.setModel(oModel);
				this.getView().addDependent(this._oPrinterVHDialog);
			}
			this._oPrinterVHDialog.open();
		},

		onPrinterManualInput: function (oEvent) {
			var oMultiInput = oEvent.getSource();
			var sValue = (oMultiInput.getValue() || '').trim();
			if (!sValue) {
				return;
			}
			var oCtx = oMultiInput.getBindingContext('print');
			if (!oCtx) {
				return;
			}
			var sPath = oCtx.getPath();
			var aTokens = (this._oPrintModel.getProperty(sPath + '/DishLabelPrintTokens') || []).slice();
			var bExists = aTokens.some(function (t) { return t.key === sValue; });
			if (!bExists) {
				aTokens.push({ key: sValue, text: sValue });
			}
			this._oPrintModel.setProperty(sPath + '/DishLabelPrintTokens', aTokens);
			this._oPrintModel.setProperty(sPath + '/DishLabelPrint',
				aTokens.map(function (t) { return t.text; }).join(';'));
			oMultiInput.setValue('');
		},

		onPrinterTokenUpdate: function (oEvent) {
			if (oEvent.getParameter('type') !== 'removed') {
				return;
			}
			var aRemovedTokens = oEvent.getParameter('removedTokens') || [];
			var oCtx = oEvent.getSource().getBindingContext('print');
			if (!oCtx) {
				return;
			}
			var sPath = oCtx.getPath();
			var aCurrentTokens = (this._oPrintModel.getProperty(sPath + '/DishLabelPrintTokens') || []).slice();
			var aRemovedKeys = aRemovedTokens.map(function (t) { return t.getKey(); });
			var aNewTokens = aCurrentTokens.filter(function (t) {
				return aRemovedKeys.indexOf(t.key) === -1;
			});
			this._oPrintModel.setProperty(sPath + '/DishLabelPrintTokens', aNewTokens);
			this._oPrintModel.setProperty(sPath + '/DishLabelPrint',
				aNewTokens.map(function (t) { return t.text; }).join(';'));
		},

		onClosePrintDialog: function () {
			if (this._oPrintDialog) {
				this._oPrintDialog.close();
			}
		},

		onPrintConfirm: async function (oEvent) {
			var oView = this.getView();
			var oModel = oView.getModel();
			var aItems = this._oPrintModel.getProperty('/items') || [];

			var aGroupRows = aItems.filter(function (oItem) {
				return oItem && oItem.RowType === 'Group';
			});

			var bAllHavePrinter = aGroupRows.every(function (oItem) {
				return !!oItem.DishLabelPrint;
			});
			
			if (!bAllHavePrinter) {
				MessageBox.error(this._getText('PleaseSelectThePrinter'));
				return;
			}

			if (!aGroupRows.length) {
				MessageBox.error(this._getText('messageSelectRows'));
				return;
			}

			try {
				oEvent.getSource().getParent().getParent().setBusy(true);

				var oActionBinding = oModel.bindContext("/ZI_PP_DISH_LABEL_FORM_PRINT/com.sap.gateway.srvd.zsd_pp_dish_label_form_print.v0001.print(...)");

				// Flatten per-group (subtotal row) for submission
				var aFlatItems = aGroupRows.map(function (oItem) {
					return {
						Material: oItem.MaterialCode || '',
						// Plant: oItem.Plant || '',
						// Zfevor: oItem.Zfevor || '',
						// Arbpl: oItem.Arbpl || '',
						Numberoflabels: String(oItem.subtotalLabels || 0),
						ZDishLabelPrint: oItem.DishLabelPrint || ''
					};
				});
				oActionBinding.setParameter("Printer", 'LP01');
				oActionBinding.setParameter("Items", aFlatItems);

				await oActionBinding.execute();
				this._oPrintModel.setProperty('/printError', false);
				this.onClosePrintDialog();
				this._showMessages();
			} catch (oError) {
				this._oPrintModel.setProperty('/printError', true);
				this._triggerTableRowColorRefresh();
				this._showMessages();
			} finally {
				oEvent.getSource().getParent().getParent().setBusy(false);
			}
		},


		_openPrintDialog: function () {
			var oView = this.getView();
			if (this._oPrintDialog) {
				var oTable = oView.byId('printTable');
				if (oTable) {
					oTable.setFirstVisibleRow(0);
				}
				this._oPrintModel.refresh(true);
				this._oPrintDialog.open();
				return;
			}
			Fragment.load({
				id: oView.getId(),
				name: 'com.cathaydining.zppf012.ext.fragment.PrintDialog',
				controller: this
			}).then(function (oDialog) {
				this._oPrintDialog = oDialog;
				oView.addDependent(oDialog);
				oDialog.open();
			}.bind(this));
		},

		_refreshPrintTotals: function () {
			var aGroups = this._oPrintModel.getProperty('/groups') || [];
			var iTotalLabels = 0;
			var iTotalQuantity = 0;
			for (var i = 0; i < aGroups.length; i++) {
				iTotalLabels += Number(aGroups[i].subtotalLabels) || 0;
				iTotalQuantity += Number(aGroups[i].TotalQuantity) || 0;
			}
			this._oPrintModel.setProperty('/summary/totalLabels', iTotalLabels);
			this._oPrintModel.setProperty('/summary/totalQuantity', iTotalQuantity);
		},

		_ensurePrintModel: function () {
			if (this._oPrintModel) {
				return;
			}
			this._oPrintModel = new JSONModel({
				printError: false,
				groups: [],
				items: [],
				summary: {
					totalLabels: 0,
					totalQuantity: 0
				}
			});
			this.getView().setModel(this._oPrintModel, 'print');
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

		_openPdfPreview: function (oView, oData) {
			var oBlob = this._createPdfBlob(oData);

			if (!oBlob) {
				return;
			}

			var sObjectUrl = URL.createObjectURL(oBlob);
			var oPdfViewer = new PDFViewer({
				width: '100%',
				title: oData.filename || this._getText('msgPrintPreview'),
				source: sObjectUrl
			});

			oPdfViewer.attachError(function () {
				MessageBox.error(this._getText('msgPdfLoadFailed'));
				URL.revokeObjectURL(sObjectUrl);
				oPdfViewer.destroy();
			});

			oView.addDependent(oPdfViewer);
			oPdfViewer.open();
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

		_getText: function (sKey) {
			if (!this._oResourceBundle) {
				var oView = this.base && this.base.getView ? this.base.getView() : this.getView();
				var oResModel = oView && oView.getModel('i18n');
				this._oResourceBundle = oResModel ? oResModel.getResourceBundle() : null;
			}
			return (this._oResourceBundle && this._oResourceBundle.getText(sKey)) || sKey;
		},

		_normalizeLabelCount: function (sValue) {
			var iValue = parseInt(sValue, 10);
			if (isNaN(iValue) || iValue < 0) {
				return null;
			}
			return iValue;
		},

		/**
		 * Groups items by MaterialCode; each group holds nested items plus aggregated totals.
		 * @param {Array} aItems The items to group
		 * @returns {Array} Group objects with nested items[]
		 * @private
		 */
		_groupItemsByMaterialCode: function (aItems) {
			var oGroupMap = {};
			var aGroupedItems = [];

			aItems.forEach(function (oItem) {
				var sKey = [oItem.MaterialCode, oItem.Plant, oItem.Zfevor, oItem.Arbpl].join('|');
				if (!oGroupMap[sKey]) {
					oGroupMap[sKey] = {
						MaterialCode: oItem.MaterialCode,
						MaterialDescription: oItem.MaterialDescription,
						Plant: oItem.Plant,
						Zfevor: oItem.Zfevor,
						Arbpl: oItem.Arbpl,
						ProdOrderUnit: oItem.ProdOrderUnit,
						TotalQuantity: 0,
						subtotalLabels: 0,
						DishLabelPrintTokens: [],
						DishLabelPrint: '',
						items: []
					};
					aGroupedItems.push(oGroupMap[sKey]);
				}

				var oGroup = oGroupMap[sKey];
				oGroup.items.push(oItem);
				oGroup.TotalQuantity += Number(oItem.ProdOrderBasedQuantity) || 0;
				oGroup.subtotalLabels += Number(oItem.NumberOfLabels) || 0;

				// Merge unique printer tokens from each item into the group
				var aItemTokens = oItem.DishLabelPrintTokens || [];
				aItemTokens.forEach(function (oToken) {
					var bExists = oGroup.DishLabelPrintTokens.some(function (t) {
						return t.key === oToken.key;
					});
					if (!bExists) {
						oGroup.DishLabelPrintTokens.push(oToken);
					}
				});
				oGroup.DishLabelPrint = oGroup.DishLabelPrintTokens.map(function (t) { return t.text; }).join(';');
			});

			aGroupedItems.sort(function (a, b) {
				return (a.Plant || '').localeCompare(b.Plant || '')
					|| (a.Zfevor || '').localeCompare(b.Zfevor || '')
					|| (a.Arbpl || '').localeCompare(b.Arbpl || '');
			});

			return aGroupedItems;
		},

		/**
		 * Flattens /groups into /items for table display: one Group header row followed by Item detail rows per group.
		 * @private
		 */
		_refreshDisplayItems: function (bPreservePrinters) {
			var aGroups = this._oPrintModel.getProperty('/groups') || [];
			var mGroupPrinters = {};
			var mGroupPrinterTokens = {};
			if (bPreservePrinters !== false) {
				var aCurrentItems = this._oPrintModel.getProperty('/items') || [];
				aCurrentItems.forEach(function (oCurrent) {
					if (oCurrent && oCurrent.RowType === 'Group') {
						mGroupPrinters[oCurrent.GroupIndex] = oCurrent.DishLabelPrint;
						mGroupPrinterTokens[oCurrent.GroupIndex] = oCurrent.DishLabelPrintTokens;
					}
				});
			}
			var aDisplay = [];
			var sSubtotalText = this._getText('subtotalRow');
			aGroups.forEach(function (oGroup, iGroupIndex) {
				(oGroup.items || []).forEach(function (oItem, iItemIndex) {
					aDisplay.push({
						RowType: 'Item',
						GroupIndex: iGroupIndex,
						ItemIndex: iItemIndex,
						ProductionOrder: oItem.ProductionOrder,
						MaterialCode: oItem.MaterialCode,
						MaterialDescription: oItem.MaterialDescription,
						Plant: oItem.Plant,
						Zfevor: oItem.Zfevor,
						Arbpl: oItem.Arbpl,
						ProdOrderBasedQuantity: oItem.ProdOrderBasedQuantity,
						ProdOrderUnit: oItem.ProdOrderUnit,
						NumberOfLabels: oItem.NumberOfLabels
					});
				});
				var sGroupPrinter = mGroupPrinters[iGroupIndex] || oGroup.DishLabelPrint || '';
				var aGroupTokens = mGroupPrinterTokens[iGroupIndex] || oGroup.DishLabelPrintTokens ||
					(sGroupPrinter ? sGroupPrinter.split(';').map(function (s) {
						var sTrimmed = s.trim();
						return { key: sTrimmed, text: sTrimmed };
					}) : []);
				aDisplay.push({
					RowType: 'Group',
					GroupIndex: iGroupIndex,
					SubtotalText: sSubtotalText,
					MaterialCode: oGroup.MaterialCode,
					MaterialDescription: oGroup.MaterialDescription,
					Plant: oGroup.Plant,
					Zfevor: oGroup.Zfevor,
					Arbpl: oGroup.Arbpl,
					TotalQuantity: oGroup.TotalQuantity,
					subtotalLabels: oGroup.subtotalLabels,
					ProdOrderUnit: oGroup.ProdOrderUnit,
					DishLabelPrint: sGroupPrinter,
					DishLabelPrintTokens: aGroupTokens
				});
			});
			this._oPrintModel.setProperty('/items', aDisplay);
			this._oPrintModel.refresh();
		},

		_triggerTableRowColorRefresh: function () {
			var oView = this.base && this.base.getView ? this.base.getView() : this.getView();
			var oTable = oView.byId("printTable");
			if (oTable) {
				this.onPrintTableRowsUpdated();
			}
		},

		/**
		 * Extracts a readable message from framework or business errors.
		 * @param {*} oError Error object
		 * @returns {string}
		 * @private
		 */
		_extractErrorMessage: function (oError) {
			if (!oError) {
				return this._getText('msgOperationFailed');
			}
			var sMsg = oError.message || '';

			// UI5 OData V4: actual ABAP message may be in the cause chain
			if (oError.cause) {
				var oCause = oError.cause;
				while (oCause) {
					if (oCause.message && oCause.message !== sMsg) {
						sMsg = oCause.message;
					}
					oCause = oCause.cause;
				}
			}

			// Try to parse the OData V4 JSON error body from the response
			var sResponseText = (oError.$response && oError.$response.body)
				|| oError.responseText
				|| (oError.error && JSON.stringify(oError.error));
			if (sResponseText) {
				try {
					var oJson = JSON.parse(sResponseText);
					var sOdataMsg = oJson && oJson.error && oJson.error.message;
					if (sOdataMsg) {
						sMsg = sOdataMsg;
					}
				} catch (e) { /* ignore parse errors */ }
			}

			return sMsg || oError.toString() || this._getText('msgOperationFailed');
		},

		_showMessages: function () {
			var oMessageManager = sap.ui.getCore().getMessageManager();
			var oMessageModel = oMessageManager.getMessageModel();
			var aMessages = oMessageModel.getData();
			if (!aMessages || aMessages.length === 0) {
				return;
			}

			var bHasError = aMessages.some(function (m) { return m.type === 'Error'; });

			var oMessageView = new sap.m.MessageView({
				showDetailsPageHeader: false,
				items: {
					path: 'message>/',
					template: new sap.m.MessageItem({
						type: '{message>type}',
						title: '{message>message}',
						subtitle: '{message>code}',
						description: '{message>description}'
					})
				}
			});
			oMessageView.setModel(oMessageModel, 'message');

			var oDialog = new sap.m.Dialog({
				title: 'Messages (' + aMessages.length + ')',
				resizable: true,
				draggable: true,
				verticalScrolling: false,
				contentHeight: '400px',
				contentWidth: '500px',
				content: oMessageView,
				state: bHasError ? 'Error' : 'Success',
				endButton: new sap.m.Button({
					text: 'Close',
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function () {
					oMessageManager.removeAllMessages();
					oDialog.destroy();
				}
			});

			oMessageView.navigateBack();
			oDialog.open();
		}
	});
});












