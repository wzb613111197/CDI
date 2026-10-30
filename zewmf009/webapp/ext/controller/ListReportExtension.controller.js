sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/Label',
	'sap/m/ComboBox',
	'sap/ui/core/Item',
	'sap/ui/core/HTML',
	'sap/ui/layout/form/SimpleForm',
	'sap/ui/mdc/p13n/StateUtil',
	'sap/m/DynamicDateUtil',
	'sap/m/MessageToast'
], function (ControllerExtension, MessageBox, Dialog, Button, Label, ComboBox, Item, HTML, SimpleForm, StateUtil, DynamicDateUtil, MessageToast) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zewmf009.ext.controller.ListReportExtension', {
		override: {
			onAfterRendering: function () {
				this._oResourceBundle = this.base.getView().getModel('i18n').getResourceBundle();
				this._setDefaultReportDates();
			},

			onExit: function () {
				if (this._pdfSourceUrl) {
					URL.revokeObjectURL(this._pdfSourceUrl);
					this._pdfSourceUrl = null;
				}
				if (this._oPdfDialog) {
					this._oPdfDialog.destroy();
					this._oPdfDialog = null;
				}
			}
		},

		_setDefaultReportDates: async function () {
			var oView = this.base.getView();
			var oFilterBar = oView.findAggregatedObjects(true, function (oControl) {
				return oControl.isA('sap.ui.mdc.FilterBar');
			})[0];

			if (!oFilterBar || this._bDefaultReportDatesApplied) {
				return;
			}

			this._bDefaultReportDatesApplied = true;
			var oState = await StateUtil.retrieveExternalState(oFilterBar);
			var mFilter = oState.filter || {};
			var oToday = new Date();
			var iYear = oToday.getFullYear();
			var iMonth = oToday.getMonth();
			var fnFormatDate = function (oDate) {
				return oDate.getFullYear() + '-' + String(oDate.getMonth() + 1).padStart(2, '0') + '-' + String(oDate.getDate()).padStart(2, '0');
			};

			if (!mFilter.start_date || !mFilter.start_date.length) {
				mFilter.start_date = [{ operator: 'EQ', values: [fnFormatDate(new Date(iYear, iMonth, 1))] }];
			}
			if (!mFilter.end_date || !mFilter.end_date.length) {
				mFilter.end_date = [{ operator: 'EQ', values: [fnFormatDate(new Date(iYear, iMonth + 1, 0))] }];
			}

			await StateUtil.applyExternalState(oFilterBar, { filter: mFilter });
		},

		onPrint: async function (oEvent, aContexts) {
			var oView = this.base.getView();
			var oBaseController = oView.getController();
			var oFilterBar = oView.findAggregatedObjects(true, function (oControl) {
				return oControl.isA('sap.ui.mdc.FilterBar');
			})[0];
			var oFilterState = oFilterBar ? await StateUtil.retrieveExternalState(oFilterBar) : {};
			var mFilter = oFilterState.filter || {};
			var fnGetFilterValue = function (sFieldName) {
				var aConditions = mFilter[sFieldName] || [];
				return aConditions[0] && aConditions[0].values ? aConditions[0].values[0] : null;
			};
			var sReportFormat = fnGetFilterValue('report_format');
			var sBond = fnGetFilterValue('bond');

			if (!sReportFormat || !sBond) {
				MessageBox.error(this._getText('msgFillRequired'));
				return;
			}

			try {
				var oResult = await oBaseController.editFlow.invokeAction(
					'com.sap.gateway.srvd.zsd_ewm_inventory.v0001.print',
					{
						contexts: aContexts,
						invocationGrouping: 'ChangeSet',
						skipParameterDialog: true,
						parameterValues: [
							{ name: 'ReportFormat', value: sReportFormat },
							{ name: 'bond', value: sBond }
						]
					}
				);
				var oData = this._extractActionResult(oResult);
				if (oData && oData.form) {
					this._openPdfPreview(oData);
					MessageToast.show(this._oResourceBundle.getText('printSuccess'));
				}
			} catch (oError) {
				MessageBox.error((oError && oError.message) || this._oResourceBundle.getText('printFailed'));
			}
		},

		_extractActionResult: function (oResult) {
			if (Array.isArray(oResult)) {
				return this._extractActionResult(oResult[0] && oResult[0].value !== undefined ? oResult[0].value : oResult[0]);
			}
			if (!oResult) {
				return null;
			}
			if (typeof oResult.getObject === 'function') {
				return oResult.getObject();
			}
			if (typeof oResult.getBoundContext === 'function') {
				var oCtx = oResult.getBoundContext();
				return oCtx && typeof oCtx.getObject === 'function' ? oCtx.getObject() : null;
			}
			if (oResult.response && oResult.response.data) {
				return oResult.response.data;
			}
			return oResult;
		},

		_openPdfPreview: function (oData) {
			var decodedPdfContent = atob(oData.form);
			var byteArray = new Uint8Array(decodedPdfContent.length);
			for (var i = 0; i < decodedPdfContent.length; i++) {
				byteArray[i] = decodedPdfContent.charCodeAt(i);
			}
			var blob = new Blob([byteArray.buffer], { type: 'application/pdf' });

			if (this._pdfSourceUrl) {
				URL.revokeObjectURL(this._pdfSourceUrl);
			}
			this._pdfSourceUrl = URL.createObjectURL(blob);

			jQuery.sap.addUrlWhitelist("blob");
			if (!this._oPdfDialog) {
				this._oPdfContent = new HTML({
					content: ''
				});
				this._oPdfDialog = new Dialog({
					title: this._getText('msgPrintPreview'),
					contentWidth: '90%',
					resizable: true,
					draggable: true,
					horizontalScrolling: false,
					verticalScrolling: false,
					content: [this._oPdfContent],
					endButton: new Button({
						text: this._getText('btnCancel'),
						press: function () {
							this._oPdfDialog.close();
						}.bind(this)
					}),
					afterClose: function () {
						this._oPdfContent.setContent('');
						if (this._pdfSourceUrl) {
							URL.revokeObjectURL(this._pdfSourceUrl);
							this._pdfSourceUrl = null;
						}
					}.bind(this)
				});
				this.base.getView().addDependent(this._oPdfDialog);
			}

			this._oPdfContent.setContent('<iframe src="' + this._pdfSourceUrl + '" style="width:100%;height:calc(100vh - 10rem);border:0;display:block;"></iframe>');
			this._oPdfDialog.open();
		},


		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}

	});
});
