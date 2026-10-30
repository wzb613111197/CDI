sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/BusyDialog',
	'sap/m/MessageToast',
	'sap/base/security/URLListValidator'
], function (ControllerExtension, MessageBox, BusyDialog, MessageToast, URLListValidator) {
	'use strict';

	var ACTION_NAME = 'com.sap.gateway.srvd.zsd_sd_standard_billing_report.v0001.Export(...)';
	var DEFAULT_FILENAME = 'quotation.xlsx';
	var DEFAULT_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
	var URL_REVOKE_DELAY = 100;

	return ControllerExtension.extend('com.cathaydining.zsdr005.ext.controller.ListReportExtension', {
		onInit: function () {
			// Initialize controller
		},

		onExport: function () {
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();

			if (!aContexts.length) {
				MessageBox.warning(this._getText('msgSelectItem'));
				return;
			}

			this._executeExport(aContexts);
		},

		_executeExport: function (aContexts) {
			var oView = this.base.getView();
			var oModel = oView.getModel();
			var sGroupId = this._generateGroupId();

			oView.setBusy(true);
			URLListValidator.add('blob');

			var aRequests = this._createBatchRequests(oModel, aContexts, sGroupId);

			oModel.submitBatch(sGroupId)
				.then(function () {
					return Promise.all(aRequests.map(function (oRequest) {
						return oRequest.promise.then(function () {
							return oRequest.operation;
						});
					}));
				})
				.then(function (aOperations) {
					var aContexts = aOperations.map(function (oOp) {
						return oOp.getBoundContext();
					});
					return this._processExportResults(aContexts);
				}.bind(this))
				.then(function (aFileData) {
					aFileData.forEach(function (oFileData, i) {
						setTimeout(function () {
							try {
								this._downloadFile(oFileData);
							} catch (oError) {
								this._handleExportError(oError);
							}
						}.bind(this), i * 500);
					}.bind(this));
					MessageBox.success(this._getText('msgExportSuccess'));
				}.bind(this))
				.catch(function (oError) {
					this._handleExportError(oError);
				}.bind(this))
				.finally(function () {
					oView.setBusy(false);
				});
		},

		_generateGroupId: function () {
			return 'ExportBatch' + Date.now();
		},

		_createBatchRequests: function (oModel, aContexts, sGroupId) {
			return aContexts.map(function (oContext) {
				var oOperation = oModel.bindContext(ACTION_NAME, oContext, {
					$$groupId: sGroupId,
					$$updateGroupId: sGroupId
				});

				return {
					operation: oOperation,
					promise: oOperation.execute(sGroupId)
				};
			});
		},

		_processExportResults: function (aReturnContexts) {
			var aResults = aReturnContexts
				.filter(function (oCtx) { return oCtx; })
				.map(function (oCtx) {
					return oCtx.getObject ? oCtx.getObject() : oCtx;
				})
				.reduce(function (acc, oData) {
					if (oData && Array.isArray(oData.value)) {
						return acc.concat(oData.value);
					}
					if (oData && oData.FileContent) {
						acc.push(oData);
					}
					return acc;
				}, [])
				.filter(function (oData) {
					return oData && oData.FileContent;
				});

			if (!aResults.length) {
				throw new Error(this._getText('msgExportFailed', [this._getText('msgNoDataReturned')]));
			}

			return aResults.map(function (oResult) {
				return {
					content: oResult.FileContent,
					filename: oResult.FileName || DEFAULT_FILENAME,
					mimeType: oResult.MimeType || DEFAULT_MIME_TYPE
				};
			});
		},

		_downloadFile: function (oFileData) {
			try {
				var sBase64 = this._cleanBase64String(oFileData.content);
				var oBlob = this._createBlobFromBase64(sBase64, oFileData.mimeType);
				this._triggerDownload(oBlob, oFileData.filename);
			} catch (oError) {
				throw new Error(this._getText('msgDownloadFailed', [oError.message]));
			}
		},

		_cleanBase64String: function (sBase64) {
			// Remove whitespace and replace URL-safe characters
			var sCleanBase64 = sBase64.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
			
			// Remove data URI prefix if present
			if (sCleanBase64.indexOf('data:') === 0) {
				var aParts = sCleanBase64.split(',');
				if (aParts.length > 1) {
					sCleanBase64 = aParts[1];
				}
			}
			
			// Fix padding
			while (sCleanBase64.length % 4 !== 0) {
				sCleanBase64 += "=";
			}
			
			return sCleanBase64;
		},

		_createBlobFromBase64: function (sBase64, sMimeType) {
			var sBinary = window.atob(sBase64);
			var oBytes = new Uint8Array(sBinary.length);
			
			for (var i = 0; i < sBinary.length; i++) {
				oBytes[i] = sBinary.charCodeAt(i);
			}
			
			return new Blob([oBytes], { type: sMimeType });
		},

		_triggerDownload: function (oBlob, sFileName) {
			var sObjectUrl = URL.createObjectURL(oBlob);
			var oLink = document.createElement("a");
			
			oLink.href = sObjectUrl;
			oLink.download = sFileName;
			document.body.appendChild(oLink);
			oLink.click();
			document.body.removeChild(oLink);
			
			// Delay URL revocation to ensure download starts
			setTimeout(function() {
				URL.revokeObjectURL(sObjectUrl);
			}, URL_REVOKE_DELAY);
		},

		_handleExportError: function (oError) {
			var sErrorMsg = (oError && oError.message) ? oError.message : String(oError);
			MessageBox.error(this._getText('msgExportFailed', [sErrorMsg]));
		},

		_getText: function (sKey, aArgs) {
			var oBundle = this.base.getView().getModel('i18n').getResourceBundle();
			return oBundle.getText(sKey, aArgs);
		}
	});
});
