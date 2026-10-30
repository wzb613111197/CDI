sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/ui/core/HTML'
], function (ControllerExtension, MessageToast, MessageBox, Dialog, Button, HTML) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zmmf004.ext.controller.ListReportExtension', {

		override: {
			onAfterRendering: function () {
				this._oResourceBundle = this.base.getView().getModel('i18n').getResourceBundle();
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

		onPrint: async function (oEvent, aContexts) {
			var oBaseController = this.base.getView().getController();
			var oExtensionAPI = this.base.getExtensionAPI();
			try {
				var oResult = await oBaseController.editFlow.invokeAction(
					'com.sap.gateway.srvd.zsd_mm_dutiable_item_interim.v0001.Print',
					{ contexts: aContexts, invocationGrouping: 'ChangeSet' }
				);
				var oData = this._extractActionResult(oResult);
				if (!oData || !oData.form || !oData.mimetype) {
					oExtensionAPI.refresh();
					MessageToast.show(this._oResourceBundle.getText('printSuccess'));
					return;
				}
				this._openPreview(oData);
				MessageToast.show(this._oResourceBundle.getText('printSuccess'));
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

		_openPreview: function (oData) {
			var that = this;
			var sBase64 = this._convertBase64(oData.form);
			var aBytes = Uint8Array.from(atob(sBase64), function (c) { return c.charCodeAt(0); });
			var oBlob = new Blob([aBytes], { type: 'application/pdf' });

			if (this._pdfSourceUrl) {
				URL.revokeObjectURL(this._pdfSourceUrl);
			}
			this._pdfSourceUrl = URL.createObjectURL(oBlob);

			if (!this._oPdfHtml) {
				this._oPdfHtml = new HTML({ preferDOM: true });
				this._oPdfDialog = new Dialog({
					contentWidth: '80%',
					resizable: true,
					draggable: true,
					content: [this._oPdfHtml],
					endButton: new Button({
						text: this._oResourceBundle.getText('buttonClose') || 'Close',
						press: function () { that._oPdfDialog.close(); }
					})
				});
				this.base.getView().addDependent(this._oPdfDialog);
			}

			this._oPdfDialog.setTitle(oData.filename || this._oResourceBundle.getText('previewTitle'));
			this._oPdfHtml.setContent(
				'<object data="' + this._pdfSourceUrl + '" type="application/pdf" ' +
				'style="width:100%;height:70vh;display:block;border:none;">' +
				'<p style="padding:1rem;">PDF cannot be displayed. ' +
				'<a href="' + this._pdfSourceUrl + '" target="_blank">Open in new tab</a></p>' +
				'</object>'
			);
			this._oPdfDialog.open();
		},

		_convertBase64: function (sInput) {
			var sClean = sInput.replace(/[^A-Za-z0-9+/=_\-]/g, '');
			sClean = sClean.replace(/-/g, '+').replace(/_/g, '/');
			var iPadding = 4 - (sClean.length % 4);
			if (iPadding !== 4) {
				sClean += '='.repeat(iPadding);
			}
			return sClean;
		}
	});
});