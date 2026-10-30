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

	return ControllerExtension.extend('com.cathaydining.zppf006.ext.controller.ListReportExtension', {
		override: {
			onAfterRendering: function () {
				this._setDefaultETDDate();
			}
		},


		onPrint: async function (oEvent, aContexts) {
			await this._callPreviewAction(aContexts, false);
		},

		onPreView: async function (oEvent, aContexts) {
			await this._callPreviewAction(aContexts, true);
		},

		_callPreviewAction: async function (aContexts, bPreview) {
			var oView = this.base.getView();
			var oBaseController = oView.getController();
			try {
				var oResult = await oBaseController.editFlow.invokeAction(
					'com.sap.gateway.srvd.zsd_pp_flight_label_form.v0001.Preview',
					{
						contexts: aContexts,
						invocationGrouping: 'ChangeSet',
						skipParameterDialog: true,
						parameterValues: [
							{ name: 'PrintPage', value: 1 },
							{ name: 'Printer', value: '' },
							{ name: 'Preview', value: bPreview }
						]
					}
				);
				var oData = this._extractActionResult(oResult);
				if (oData && oData.form) {
					if (bPreview) {
						this._openPdfPreview(oData);
					} else {
						this._printPdf(oData);
					}
				}
			} catch (oError) {
				// error handled by FE framework
			}
		},

		_extractActionResult: function (oResult) {
			if (!oResult) {
				return null;
			}
			if (Array.isArray(oResult)) {
				for (var i = 0; i < oResult.length; i++) {
					var oData = this._extractActionResult(oResult[i]);
					if (oData && oData.form) {
						return oData;
					}
				}
				return null;
			}
			if (typeof oResult.getObject === 'function') {
				return oResult.getObject();
			}
			if (typeof oResult.getBoundContext === 'function') {
				var oCtx = oResult.getBoundContext();
				if (oCtx && typeof oCtx.getObject === 'function') {
					return oCtx.getObject();
				}
			}
			if (oResult.value !== undefined) {
				return this._extractActionResult(oResult.value);
			}
			if (oResult.form) {
				return oResult;
			}
			return null;
		},

		_openPdfPreview: function (oData) {
			var sBase64 = oData.form.replace(/-/g, '+').replace(/_/g, '/');
			var iPadding = sBase64.length % 4;
			if (iPadding) { sBase64 += '='.repeat(4 - iPadding); }
			var decodedPdfContent = atob(sBase64);
			var byteArray = new Uint8Array(decodedPdfContent.length);
			for (var i = 0; i < decodedPdfContent.length; i++) {
				byteArray[i] = decodedPdfContent.charCodeAt(i);
			}
			var blob = new Blob([byteArray.buffer], { type: 'application/pdf' });

			if (this._pdfSourceUrl) {
				URL.revokeObjectURL(this._pdfSourceUrl);
			}
			this._pdfSourceUrl = URL.createObjectURL(blob);

			jQuery.sap.addUrlWhitelist('blob');
			if (!this._oPdfDialog) {
				this._oPdfContent = new HTML({
					content: ''
				});
				this._oPdfDialog = new Dialog({
					title: this._getText('dialogPreviewTitle'),
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

			this._oPdfContent.setContent('<iframe src=\'' + this._pdfSourceUrl + '\' style=\'width:100%;height:calc(100vh - 10rem);border:0;display:block;\'></iframe>');
			this._oPdfDialog.open();
		},

		_printPdf: function (oData) {
			var sBase64 = oData.form.replace(/-/g, '+').replace(/_/g, '/');
			var iPadding = sBase64.length % 4;
			if (iPadding) { sBase64 += '='.repeat(4 - iPadding); }
			var decodedPdfContent = atob(sBase64);
			var byteArray = new Uint8Array(decodedPdfContent.length);
			for (var i = 0; i < decodedPdfContent.length; i++) {
				byteArray[i] = decodedPdfContent.charCodeAt(i);
			}
			var blob = new Blob([byteArray.buffer], { type: 'application/pdf' });
			var sUrl = URL.createObjectURL(blob);

			jQuery.sap.addUrlWhitelist('blob');
			if (this._oPrintIframe) {
				this._oPrintIframe.remove();
			}
			this._oPrintIframe = document.createElement('iframe');
			this._oPrintIframe.style.position = 'absolute';
			this._oPrintIframe.style.left = '-9999px';
			this._oPrintIframe.src = sUrl;
			this._oPrintIframe.onload = function () {
				this._oPrintIframe.contentWindow.print();
			}.bind(this);
			document.body.appendChild(this._oPrintIframe);
		},

		_setDefaultETDDate: async function () {
			var oView = this.base.getView();
			var oFilterBar = oView.findAggregatedObjects(true, function (oControl) {
				return oControl.isA('sap.ui.mdc.FilterBar');
			})[0];

			if (!oFilterBar || this._bDefaultETDDateApplied) {
				return;
			}

			this._bDefaultETDDateApplied = true;
			var oState = await StateUtil.retrieveExternalState(oFilterBar);
			var mFilter = oState.filter || {};

			if (!mFilter.ETDDate || !mFilter.ETDDate.length) {
				var oToday = new Date();
				var sToday = oToday.getFullYear() + '-' + String(oToday.getMonth() + 1).padStart(2, '0') + '-' + String(oToday.getDate()).padStart(2, '0');
				mFilter.ETDDate = [{ operator: 'EQ', values: [sToday] }];
				await StateUtil.applyExternalState(oFilterBar, { filter: mFilter });
			}
		},

		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}

	});
});
