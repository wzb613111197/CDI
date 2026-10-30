sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/model/json/JSONModel',
	'sap/ui/core/Fragment',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/base/security/URLListValidator'
], function (ControllerExtension, JSONModel, Fragment, MessageBox, MessageToast, URLListValidator) {
	'use strict';

	var ACTION_NAME = 'com.sap.gateway.srvd.zsd_pp_ldgdef_hdr.v0001.ExportCpaSpmlAssignmentRule';
	var ENTITY_SET = 'ZC_PP_LDGDEF_HDR';
	var TABLE_ID = 'fe::table::ZC_PP_LDGDEF_HDR::LineItem';
	var DEFAULT_FILENAME = 'ExportCpaSpmlAssignmentRule.zip';
	var DEFAULT_MIME_TYPE = 'application/zip';
	var URL_REVOKE_DELAY = 100;

	return ControllerExtension.extend('com.cathaydining.zppe024.ext.controller.ListReportExtension', {

		override: {
			onInit: function () {
			}
		},

		/**
		 * List Report CustomerAction for static ExportCpaSpmlAssignmentRule.
		 * Opens the export parameter dialog (Valid From defaults to today).
		 */
		onExportCpaSpmlAssignmentRule: function () {
			this._openExportCpaDialog();
		},

		onExportCpaClose: function () {
			if (this._oExportCpaDialog) {
				this._oExportCpaDialog.close();
			}
		},

		onExportDateChange: function (oEvent) {
			var oDP = oEvent.getSource();
			var sValue = oEvent.getParameter('value');
			var bValid = oEvent.getParameter('valid');

			if (!sValue) {
				oDP.setValueState('None');
				oDP.setValueStateText('');
				return;
			}
			if (bValid === false || (typeof oDP.isValidValue === 'function' && !oDP.isValidValue())) {
				oDP.setValueState('Error');
				oDP.setValueStateText(this.base.getView().getModel('i18n').getResourceBundle().getText('msgInvalidDateFormat'));
				return;
			}
			oDP.setValueState('None');
			oDP.setValueStateText('');
		},

		onExportCpaDownload: async function () {
			var oModel = this._getExportModel();
			var oData = oModel.getData();
			var oView = this.base.getView();
			var oResourceBundle = oView.getModel('i18n').getResourceBundle();
			var oValidFromDP = this._getExportDatePicker('exportValidFrom');
			var oValidToDP = this._getExportDatePicker('exportValidTo');
			var sValidFrom;
			var sValidTo;
			var bSpml = !!oData.SpmlAssignment;
			var bCrwml = !!oData.CrwmlAssignment;
			var bFlightTag = !!oData.FlightTagMapping;
			var oHeaderContext;

			if (!this._isExportDatePickerOk(oValidFromDP, true, oResourceBundle)) {
				return;
			}
			if (!this._isExportDatePickerOk(oValidToDP, false, oResourceBundle)) {
				return;
			}

			sValidFrom = this._toEdmDateValue(oData.ValidFrom);
			sValidTo = this._toEdmDateValue(oData.ValidTo);

			if (!sValidFrom) {
				if (oValidFromDP) {
					oValidFromDP.setValueState('Error');
					oValidFromDP.setValueStateText(oResourceBundle.getText('msgValidFromRequired'));
				}
				MessageToast.show(oResourceBundle.getText('msgValidFromRequired'));
				return;
			}
			if (oData.ValidTo && !sValidTo) {
				if (oValidToDP) {
					oValidToDP.setValueState('Error');
					oValidToDP.setValueStateText(oResourceBundle.getText('msgInvalidDateFormat'));
				}
				MessageToast.show(oResourceBundle.getText('msgInvalidDateFormat'));
				return;
			}
			if (sValidTo && sValidTo < sValidFrom) {
				if (oValidToDP) {
					oValidToDP.setValueState('Error');
					oValidToDP.setValueStateText(oResourceBundle.getText('msgValidToBeforeValidFrom'));
				}
				MessageToast.show(oResourceBundle.getText('msgValidToBeforeValidFrom'));
				return;
			}
			if (!bSpml && !bCrwml && !bFlightTag) {
				MessageToast.show(oResourceBundle.getText('msgSelectAtLeastOneFile'));
				return;
			}

			oHeaderContext = this._getEntitySetHeaderContext();
			if (!oHeaderContext) {
				MessageBox.error(oResourceBundle.getText('msgExportFailed', ['Missing entity set context']));
				return;
			}

			this._oExportCpaDialog.setBusy(true);
			URLListValidator.add('blob');

			try {
				var oBaseController = oView.getController();
				var oResult = await oBaseController.editFlow.invokeAction(ACTION_NAME, {
					contexts: oHeaderContext,
					skipParameterDialog: true,
					parameterValues: [
						{ name: 'ValidFrom', value: sValidFrom },
						{ name: 'ValidTo', value: sValidTo },
						{ name: 'SpmlAssignment', value: bSpml },
						{ name: 'CrwmlAssignment', value: bCrwml },
						{ name: 'FlightTagMapping', value: bFlightTag }
					]
				});
				this._handleExportResult(this._extractActionResults(oResult), oResourceBundle);
			} catch (oError) {
			} finally {
				if (this._oExportCpaDialog) {
					this._oExportCpaDialog.setBusy(false);
				}
			}
		},

		/**
		 * RAP static actions are collection-bound in OData V4.
		 * invokeAction needs the entity-set header context (not selected rows, not model-only).
		 */
		_getEntitySetHeaderContext: function () {
			var oView = this.base.getView();
			var oTable = oView.byId(TABLE_ID);
			var oBinding;
			var oModel;
			var oListBinding;

			if (!oTable) {
				oTable = oView.findAggregatedObjects(true, function (oControl) {
					return oControl.isA && oControl.isA('sap.ui.mdc.Table');
				})[0];
			}

			if (oTable) {
				oBinding = typeof oTable.getRowBinding === 'function' ? oTable.getRowBinding() : null;
				if (!oBinding && typeof oTable.getBinding === 'function') {
					oBinding = oTable.getBinding('items') || oTable.getBinding('rows');
				}
				if (oBinding && typeof oBinding.getHeaderContext === 'function') {
					return oBinding.getHeaderContext();
				}
			}

			oModel = oView.getModel();
			if (!oModel || typeof oModel.bindList !== 'function') {
				return null;
			}
			oListBinding = oModel.bindList('/' + ENTITY_SET);
			return oListBinding.getHeaderContext && oListBinding.getHeaderContext();
		},

		_openExportCpaDialog: function () {
			var oView = this.base.getView();

			if (!this._oExportModel) {
				this._oExportModel = new JSONModel(this._getDefaultExportData());
				oView.setModel(this._oExportModel, 'exportModel');
			} else {
				this._oExportModel.setData(this._getDefaultExportData());
			}

			if (this._oExportCpaDialog && !this._oExportCpaDialog.bIsDestroyed) {
				this._oExportCpaDialog.open();
				return;
			}

			if (!this._pExportCpaDialog) {
				this._pExportCpaDialog = Fragment.load({
					id: oView.getId(),
					name: 'com.cathaydining.zppe024.ext.fragment.ExportCpaSpmlAssignmentRuleDialog',
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					this._oExportCpaDialog = oDialog;
					oDialog.open();
					return oDialog;
				}.bind(this)).catch(function (oError) {
					this._pExportCpaDialog = null;
					this._oExportCpaDialog = null;
					throw oError;
				}.bind(this));
			} else {
				this._pExportCpaDialog.then(function (oDialog) {
					oDialog.open();
				}.bind(this));
			}
		},

		_toLocalDateOnly: function (vValue) {
			var oDate;
			var aMatch;

			if (!vValue) {
				return null;
			}
			if (vValue instanceof Date && !isNaN(vValue.getTime())) {
				return new Date(vValue.getFullYear(), vValue.getMonth(), vValue.getDate());
			}
			if (typeof vValue === 'string') {
				aMatch = String(vValue).match(/(\d{4})-(\d{2})-(\d{2})/);
				if (aMatch) {
					return new Date(Number(aMatch[1]), Number(aMatch[2]) - 1, Number(aMatch[3]));
				}
				oDate = new Date(vValue);
				if (!isNaN(oDate.getTime())) {
					return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
				}
			}
			return null;
		},

		_getDefaultExportData: function () {
			return {
				ValidFrom: this._getTodayDateString(),
				ValidTo: null,
				SpmlAssignment: true,
				CrwmlAssignment: true,
				FlightTagMapping: true
			};
		},

		_getTodayDateString: function () {
			var oToday = new Date();
			return [
				String(oToday.getFullYear()).padStart(4, '0'),
				String(oToday.getMonth() + 1).padStart(2, '0'),
				String(oToday.getDate()).padStart(2, '0')
			].join('-');
		},

		_getExportModel: function () {
			return this._oExportModel || this.base.getView().getModel('exportModel');
		},

		/**
		 * Normalizes invokeAction result into an array of
		 * { FileName, content, mimetype } items.
		 */
		_extractActionResults: function (oResult) {
			var aItems = [];

			function pushItem(oItem) {
				if (!oItem) {
					return;
				}
				if (Array.isArray(oItem)) {
					oItem.forEach(pushItem);
					return;
				}
				if (typeof oItem.getObject === 'function') {
					pushItem(oItem.getObject());
					return;
				}
				if (typeof oItem.getBoundContext === 'function') {
					var oCtx = oItem.getBoundContext();
					pushItem(oCtx && typeof oCtx.getObject === 'function' ? oCtx.getObject() : null);
					return;
				}
				if (oItem.response && oItem.response.data) {
					pushItem(oItem.response.data);
					return;
				}
				if (oItem.returnedContext) {
					pushItem(oItem.returnedContext);
					return;
				}
				if (oItem.status === 'fulfilled') {
					pushItem(oItem.value);
					return;
				}
				if (oItem.value !== undefined) {
					pushItem(oItem.value);
					return;
				}
				if (oItem.content || oItem.FileRaw) {
					aItems.push(oItem);
				}
			}

			pushItem(oResult);
			return aItems;
		},

		_handleExportResult: function (aResults, oResourceBundle) {
			var aFiles = Array.isArray(aResults) ? aResults : (aResults ? [aResults] : []);
			var iDownloaded = 0;
			var i;

			if (!aFiles.length) {
				MessageBox.error(oResourceBundle.getText('msgNoDataReturned'));
				return;
			}

			for (i = 0; i < aFiles.length; i++) {
				if (this._downloadExportItem(aFiles[i], i)) {
					iDownloaded++;
				}
			}

			if (!iDownloaded) {
				MessageBox.error(oResourceBundle.getText('msgNoDataReturned'));
				return;
			}

			MessageToast.show(oResourceBundle.getText('msgExportSuccess'));
			if (this._oExportCpaDialog) {
				this._oExportCpaDialog.close();
			}
		},

		_downloadExportItem: function (oItem, iIndex) {
			var vContent = oItem.content || oItem.FileRaw;
			var sFileName = oItem.FileName || oItem.fileName || DEFAULT_FILENAME;
			var sMimeType = oItem.mimetype || oItem.MimeType || DEFAULT_MIME_TYPE;

			if (!vContent) {
				return false;
			}

			// Stagger clicks so the browser does not block subsequent downloads.
			setTimeout(function () {
				this._downloadFile(vContent, sFileName, sMimeType);
			}.bind(this), iIndex * 200);

			return true;
		},

		_downloadFile: function (vContent, sFileName, sMimeType) {
			var oBlob = this._createBlobFromBinary(vContent, sMimeType);
			var sObjectUrl = URL.createObjectURL(oBlob);
			var oLink = document.createElement('a');

			oLink.href = sObjectUrl;
			oLink.download = sFileName || DEFAULT_FILENAME;
			document.body.appendChild(oLink);
			oLink.click();
			document.body.removeChild(oLink);

			setTimeout(function () {
				URL.revokeObjectURL(sObjectUrl);
			}, URL_REVOKE_DELAY);
		},

		_createBlobFromBinary: function (vContent, sMimeType) {
			var aBytes;

			if (vContent instanceof ArrayBuffer) {
				aBytes = new Uint8Array(vContent);
			} else if (vContent instanceof Uint8Array) {
				aBytes = vContent;
			} else if (typeof vContent === 'string') {
				aBytes = this._base64ToUint8Array(vContent);
			} else {
				throw new Error('Unsupported binary content');
			}

			return new Blob([aBytes], { type: sMimeType || DEFAULT_MIME_TYPE });
		},

		_base64ToUint8Array: function (sBase64) {
			var sClean = String(sBase64).replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
			var iPadding;
			var sBinary;
			var aBytes;
			var i;

			if (sClean.indexOf('data:') === 0) {
				sClean = sClean.split(',')[1] || '';
			}

			iPadding = sClean.length % 4;
			if (iPadding) {
				sClean += '===='.substring(0, 4 - iPadding);
			}

			sBinary = window.atob(sClean);
			aBytes = new Uint8Array(sBinary.length);
			for (i = 0; i < sBinary.length; i++) {
				aBytes[i] = sBinary.charCodeAt(i);
			}
			return aBytes;
		},

		_getExportDatePicker: function (sInnerId) {
			var oView = this.base.getView();
			return Fragment.byId(oView.getId(), sInnerId) || oView.byId(sInnerId);
		},

		/**
		 * Validates DatePicker content before export.
		 * @param {sap.m.DatePicker} oDP
		 * @param {boolean} bRequired
		 * @param {sap.base.i18n.ResourceBundle} oResourceBundle
		 * @returns {boolean}
		 * @private
		 */
		_isExportDatePickerOk: function (oDP, bRequired, oResourceBundle) {
			var sRaw;

			if (!oDP) {
				return true;
			}
			sRaw = (oDP.getValue && oDP.getValue()) || '';
			if (!sRaw) {
				if (bRequired) {
					oDP.setValueState('Error');
					oDP.setValueStateText(oResourceBundle.getText('msgValidFromRequired'));
					MessageToast.show(oResourceBundle.getText('msgValidFromRequired'));
					return false;
				}
				oDP.setValueState('None');
				oDP.setValueStateText('');
				return true;
			}
			if (typeof oDP.isValidValue === 'function' && !oDP.isValidValue()) {
				oDP.setValueState('Error');
				oDP.setValueStateText(oResourceBundle.getText('msgInvalidDateFormat'));
				MessageToast.show(oResourceBundle.getText('msgInvalidDateFormat'));
				return false;
			}
			oDP.setValueState('None');
			oDP.setValueStateText('');
			return true;
		},

		/**
		 * Returns yyyy-MM-dd or null. Rejects non-calendar / malformed values.
		 * @param {string|Date} vValue
		 * @returns {string|null}
		 * @private
		 */
		_toEdmDateValue: function (vValue) {
			var oLocal;
			var aMatch;
			var iY;
			var iM;
			var iD;

			if (!vValue) {
				return null;
			}
			if (typeof vValue === 'string') {
				aMatch = String(vValue).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
				if (!aMatch) {
					return null;
				}
				iY = Number(aMatch[1]);
				iM = Number(aMatch[2]);
				iD = Number(aMatch[3]);
				oLocal = new Date(iY, iM - 1, iD);
				if (oLocal.getFullYear() !== iY || oLocal.getMonth() !== iM - 1 || oLocal.getDate() !== iD) {
					return null;
				}
				return aMatch[1] + '-' + aMatch[2] + '-' + aMatch[3];
			}
			oLocal = this._toLocalDateOnly(vValue);
			if (oLocal) {
				return [
					String(oLocal.getFullYear()).padStart(4, '0'),
					String(oLocal.getMonth() + 1).padStart(2, '0'),
					String(oLocal.getDate()).padStart(2, '0')
				].join('-');
			}
			return null;
		},

		_extractErrorMessage: function (oError) {
			if (!oError) {
				return '';
			}
			if (oError.error && oError.error.message) {
				return typeof oError.error.message === 'string'
					? oError.error.message
					: (oError.error.message.value || JSON.stringify(oError.error.message));
			}
			if (oError.message) {
				return oError.message;
			}
			return String(oError);
		}
	});
});
