sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/table/plugins/SelectionPlugin',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment'
], function (ControllerExtension, SelectionPlugin, MessageBox, MessageToast, JSONModel, Fragment) {
	'use strict';

	var ACTION_NAME = 'com.sap.gateway.srvd.zsd_fi_002_head.v0001.Simulator(...)';

	return ControllerExtension.extend('com.cathaydining.zfii002.ext.controller.ListReportExtension', {
		override: {
			onInit: function () {
				var oNow = new Date();
				var sYear = String(oNow.getFullYear());
				var sMonth = String(oNow.getMonth() + 1);
				this._oSimulatorModel = new JSONModel({
					Bukrs: '1740',
					Gjahr: sYear,
					Poper: sMonth,
					ZexportFdata: false
				});
				this.base.getView().setModel(this._oSimulatorModel, 'simulator');
			},

			routing: {
				onAfterBinding: function () {
					this._attachSelectAllHandler();
				}
			}
		},

		onOpenSimulatorDialog: async function () {
			if (!this._oSimulatorDialog) {
				this._oSimulatorDialog = await Fragment.load({
					id: this.base.getView().getId(),
					name: 'com.cathaydining.zfii002.ext.fragment.SimulatorDialog',
					controller: this
				});
				this.base.getView().addDependent(this._oSimulatorDialog);
			}
			this._oSimulatorDialog.open();
		},

		onCloseSimulatorDialog: function () {
			if (this._oSimulatorDialog) {
				this._oSimulatorDialog.close();
			}
		},

		onConfirmSimulator: function () {
			var oData = this._oSimulatorModel.getData();

			if (!oData.Bukrs) {
				MessageBox.warning(this._getText('msgEnterCompanyCode'));
				return;
			}
			if (!oData.Gjahr) {
				MessageBox.warning(this._getText('msgEnterFiscalYear'));
				return;
			}
			if (!oData.Poper) {
				MessageBox.warning(this._getText('msgEnterPostingPeriod'));
				return;
			}

			var oView = this.base.getView();
			oView.setBusy(true);

			var that = this;
			var oModel = oView.getModel();

			var oActionBinding = oModel.bindContext('/Head/' + ACTION_NAME);
			oActionBinding.setParameter('Bukrs', oData.Bukrs);
			oActionBinding.setParameter('Gjahr', oData.Gjahr);
			oActionBinding.setParameter('Poper', oData.Poper);
			oActionBinding.setParameter('ZexportFdata', oData.ZexportFdata);

			oActionBinding.execute().then(function () {
				that._showMessages();
				that.onCloseSimulatorDialog();
				setTimeout(function () { oModel.refresh(); }, 500);
			}).catch(function () {
				that._showMessages();
			}).finally(function () {
				oView.setBusy(false);
			});
		},

		_attachSelectAllHandler: function () {
			var that = this;
			var oView = this.base.getView();
			if (!oView || this._bSelectAllAttached) {
				return;
			}
			this._bSelectAllAttached = true;

			var fnDoSelectAll = function () {
				setTimeout(function () {
					that._trySelectAll();
				}, 1000);
			};

			var oFilterBar = this._findFilterBar(oView);
			if (oFilterBar) {
				oFilterBar.attachSearch(fnDoSelectAll, this);
			}

			fnDoSelectAll();
		},

		_trySelectAll: function () {
			var that = this;
			var oView = this.base.getView();
			var aMDCTables = oView.findAggregatedObjects(true, function (oControl) {
				return oControl && oControl.isA && oControl.isA('sap.ui.mdc.Table');
			});
			var oMDCTable = aMDCTables && aMDCTables[0];
			if (!oMDCTable) {
				return;
			}

			oMDCTable.initialized().then(function () {
				var oInnerTable = oMDCTable._oTable;
				if (!oInnerTable) {
					return;
				}
				var oBinding = oInnerTable.getBinding('rows');
				if (oBinding && oBinding.getLength() > 0) {
					that._selectAllRows(oInnerTable, oMDCTable);
				} else if (oBinding) {
					oBinding.attachEventOnce('dataReceived', function () {
						setTimeout(function () {
							that._selectAllRows(oInnerTable, oMDCTable);
						}, 300);
					});
				}
			});
		},

		_findFilterBar: function (oView) {
			var aControls = oView.findAggregatedObjects(true, function (oControl) {
				return oControl && oControl.isA && oControl.isA('sap.ui.mdc.FilterBar');
			});
			return aControls && aControls[0] ? aControls[0] : null;
		},

		_selectAllRows: function (oInnerTable, oMDCTable) {
			if (!oInnerTable) {
				return;
			}

			var that = this;
			var oPlugin = SelectionPlugin.findOn(oInnerTable);
			if (!oPlugin && oMDCTable && oMDCTable._oTable) {
				oPlugin = SelectionPlugin.findOn(oMDCTable._oTable);
			}

			if (oPlugin && typeof oPlugin.setSelected === 'function') {
				var aRows = oInnerTable.getRows();
				aRows.forEach(function (oRow) {
					if (oRow.getBindingContext()) {
						oPlugin.setSelected(oRow, true);
					}
				});
			} else if (oPlugin && typeof oPlugin.selectAll === 'function') {
				oPlugin.selectAll();
			}

			if (!this._bLockAttached && oPlugin) {
				this._bLockAttached = true;

				oPlugin.attachSelectionChange(function () {
					if (!that._bReselecting) {
						that._bReselecting = true;
						setTimeout(function () {
							that._selectAllRows(oInnerTable, oMDCTable);
							that._bReselecting = false;
						}, 0);
					}
				});

				oInnerTable.attachRowsUpdated(function () {
					if (!that._bReselecting) {
						that._bReselecting = true;
						setTimeout(function () {
							that._selectAllRows(oInnerTable, oMDCTable);
							that._bReselecting = false;
						}, 100);
					}
				});
			}
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
		},

		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}
	});
});
