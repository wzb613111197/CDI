sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/PDFViewer',
	'sap/base/security/URLListValidator'
], function (ControllerExtension, MessageBox, PDFViewer, URLListValidator) {
	'use strict';

	var PRINT_ACTION_PATH = 'com.sap.gateway.srvd.zsd_ewm_bdir_print.v0001.print(...)';

	return ControllerExtension.extend('com.cathaydining.zewmf005.ext.controller.ListReportExtension', {
		onInit: function () {

		},

		onPrint: function () {
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();

			if (!aContexts.length) {
				MessageBox.error(this._getText('msgSelectItem'));
				return;
			}

			var that = this;
			MessageBox.show(this._getText('msgIsPrintPreview'), {
				icon: MessageBox.Icon.QUESTION,
				title: this._getText('msgPrintTitle'),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO, MessageBox.Action.CANCEL],
				onClose: function (sAction) {
					if (sAction === MessageBox.Action.CANCEL) {
						return;
					};
					that._executePrint(aContexts, sAction === MessageBox.Action.YES);
				}
			});
		},

		_executePrint: function (aContexts, bIsPreview) {
			var oView = this.base.getView();
			var oModel = oView.getModel();
			var sGroupId = 'PrintBatch' + Date.now();
			var aRequests;
			oView.setBusy(true);
			URLListValidator.add('blob');

			aRequests = aContexts.map(function (oContext) {
				var oOperation = oModel.bindContext(PRINT_ACTION_PATH, oContext, {
					$$groupId: sGroupId,
					$$updateGroupId: sGroupId
				});
				oOperation.setParameter('IsPreview', bIsPreview);

				return {
					operation: oOperation,
					promise: oOperation.execute(sGroupId)
				};
			});

			oModel.submitBatch(sGroupId).then(function () {
				return Promise.all(aRequests.map(function (oRequest) {
					return oRequest.promise.then(function () {
						return oRequest.operation;
					});
				}));
			}).then(function (aOperations) {
				if (!bIsPreview) {
					MessageBox.success(this._getText('msgPrintSuccess'));
					return;
				}

				var aResults = aOperations.map(function (oOperation) {
					var oResultContext = oOperation.getBoundContext();
					return oResultContext ? oResultContext.getObject() : null;
				}).filter(function (oData) {
					return oData && oData.form;
				});

				if (!aResults.length) {
					MessageBox.error(this._getText('msgNoPdfData'));
					return;
				}

				if (aResults.length === 1) {
					this._openPdfPreview(oView, aResults[0]);
					return;
				}

				aResults.forEach(function (oData, iIndex) {
					this._downloadPdf(oData, iIndex + 1);
				}.bind(this));

				MessageBox.information(this._getText('msgPdfGenerated', [aResults.length]));
			}.bind(this)).catch(function (oError) {
				MessageBox.error(this._getText('msgPrintFailed', [((oError && oError.message) || String(oError))]));
			}.bind(this)).finally(function () {
				oView.setBusy(false);
			});
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

		_downloadPdf: function (oData, iIndex) {
			var oBlob = this._createPdfBlob(oData);

			if (!oBlob) {
				return;
			}

			var sObjectUrl = URL.createObjectURL(oBlob);
			var oLink = document.createElement('a');
			oLink.href = sObjectUrl;
			oLink.download = oData.filename || ('Print-' + iIndex + '.pdf');
			document.body.appendChild(oLink);
			oLink.click();
			document.body.removeChild(oLink);
			setTimeout(function () {
				URL.revokeObjectURL(sObjectUrl);
			}, 0);
		},

		_createPdfBlob: function (oData) {
			var sBase64;
			var iPadding;
			var sBinaryString;
			var aBytes;
			var i;

			if (!oData || !oData.form) {
				MessageBox.error(this._getText('msgNoPdfData'));
				return null;
			}

			sBase64 = typeof oData.form === 'string'
				? oData.form.replace(/-/g, '+').replace(/_/g, '/')
				: oData.form;
			iPadding = sBase64.length % 4;

			if (iPadding) {
				sBase64 += '='.repeat(4 - iPadding);
			}

			try {
				sBinaryString = atob(sBase64);
			} catch (oError) {
				MessageBox.error(this._getText('msgInvalidBase64'));
				return null;
			}

			aBytes = new Uint8Array(sBinaryString.length);
			for (i = 0; i < sBinaryString.length; i++) {
				aBytes[i] = sBinaryString.charCodeAt(i);
			}

			return new Blob([aBytes], { type: oData.mimetype || 'application/pdf' });
		},

		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}

	});
});
