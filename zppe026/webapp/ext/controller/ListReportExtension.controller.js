sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/core/Fragment',
	'sap/ui/core/routing/HashChanger',
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageToast',
	'sap/m/MessageBox',
	'sap/m/BusyDialog',
	'sap/base/Log'
], function (ControllerExtension, Fragment, HashChanger, JSONModel, MessageToast, MessageBox, BusyDialog, Log) {
	'use strict';

	var ACTION_COMPARE_FQN =
		'com.sap.gateway.srvd.zpp_pp_ldgrmp_hdr.v0001.SimulateAndCompare';
	// Bound to ZC_PP_LDGRMP_FLORD instance (implemented in ZCL_PP_BP_LDGRMP_FLORD)

	var PAGE_FILTERS = {
		ZC_PP_LDGRMP_DEFList: {
			entity: 'ZC_PP_LDGRMP_DEF',
			fields: ['LoadingTemplateCode', 'AirlineCode']
		},
		ZC_PP_LDGRMP_FLORDList: {
			entity: 'ZC_PP_LDGRMP_FLORD',
			fields: ['LoadingDefinitionCode', 'ScheduledDepartureDate']
		},
		ZI_PP_SIMU_FLORDList: {
			entity: 'ZI_PP_SIMU_FLORD',
			fields: ['AirlineCode', 'StdDate', 'LoadingDefinitionCode']
		}
	};

	return ControllerExtension.extend('com.cathaydining.zppe026.ext.controller.ListReportExtension', {
		override: {
			onInit: function () {
				var sViewId = this.base.getView().getId();
				this._oPageFilter = null;
				Object.keys(PAGE_FILTERS).forEach(function (sRoute) {
					if (sViewId.indexOf(sRoute) >= 0) {
						this._oPageFilter = PAGE_FILTERS[sRoute];
						this._sPageRoute = sRoute;
					}
				}.bind(this));

				if (!this._oPageFilter) {
					return;
				}

				var oRouter = this.base.getAppComponent().getRouter();
				this._fnRouteMatched = function (oEvent) {
					if (oEvent.getParameter('name') !== this._sPageRoute) {
						return;
					}
					var oArgs = oEvent.getParameter('arguments') || {};
					this._applyQueryFilters(oArgs['?query'] || null);
				}.bind(this);
				oRouter.attachRouteMatched(this._fnRouteMatched);

				// First open: routeMatched may already have fired before attach
				this._applyQueryFilters(null);
			},

			onExit: function () {
				if (this._fnRouteMatched) {
					this.base.getAppComponent().getRouter().detachRouteMatched(this._fnRouteMatched);
					this._fnRouteMatched = null;
				}
				if (this._oSearchFlightOrderDialog) {
					this._oSearchFlightOrderDialog.destroy();
					this._oSearchFlightOrderDialog = null;
					this._pSearchFlightOrderDialog = null;
				}
				if (this._oCompareResultDialog) {
					this._oCompareResultDialog.destroy();
					this._oCompareResultDialog = null;
					this._pCompareResultDialog = null;
				}
				if (this._oBusyDialog) {
					this._oBusyDialog.destroy();
					this._oBusyDialog = null;
				}
			}
		},

		/**
		 * Navigate to ZC_PP_LDGRMP_DEF List Report with selected AirlineCode / LoadingTemplateCode as filters.
		 */
		onSearchLoadingDefinition: function () {
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();
			if (!aContexts || !aContexts.length) {
				return;
			}

			var mAirline = {};
			var mTemplate = {};
			aContexts.forEach(function (oContext) {
				var sAirline = oContext.getProperty('AirlineCode');
				var sTemplate = oContext.getProperty('LoadingTemplateCode');
				if (sAirline) {
					mAirline[sAirline] = true;
				}
				if (sTemplate) {
					mTemplate[sTemplate] = true;
				}
			});

			var aAirlineCodes = Object.keys(mAirline);
			var aTemplateCodes = Object.keys(mTemplate);
			var aParams = [];
			if (aAirlineCodes.length) {
				aParams.push('AirlineCode=' + encodeURIComponent(aAirlineCodes.join(';')));
			}
			if (aTemplateCodes.length) {
				aParams.push('LoadingTemplateCode=' + encodeURIComponent(aTemplateCodes.join(';')));
			}

			HashChanger.getInstance().setHash(
				'ZC_PP_LDGRMP_DEF' + (aParams.length ? '?' + aParams.join('&') : '')
			);
		},

		/**
		 * Prompt for Scheduled Departure Date, then navigate to FLORD with
		 * LoadingDefinitionCode (from selected DEF rows) + date filters.
		 */
		onSearchFlightOrder: async function () {
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();
			if (!aContexts || !aContexts.length) {
				MessageToast.show(this._getText('msgSelectRowRequired'));
				return;
			}

			var mCode = {};
			aContexts.forEach(function (oContext) {
				var sCode = oContext.getProperty('LoadingDefinitionCode');
				if (sCode) {
					mCode[sCode] = true;
				}
			});
			this._aPendingFlightOrderCodes = Object.keys(mCode);
			if (!this._aPendingFlightOrderCodes.length) {
				MessageToast.show(this._getText('msgNoLoadingDefinitionCode'));
				return;
			}

			var oDialog = await this._getSearchFlightOrderDialog();
			var oDatePicker = this.base.getView().byId('scheduledDepartureDatePicker');
			if (oDatePicker) {
				oDatePicker.setValue('');
				oDatePicker.setValueState('None');
			}
			oDialog.open();
		},

		onConfirmSearchFlightOrder: function () {
			var oDatePicker = this.base.getView().byId('scheduledDepartureDatePicker');
			var sDate = '';
			if (oDatePicker) {
				if (typeof oDatePicker.getDateValue === 'function' && oDatePicker.getDateValue()) {
					sDate = this._formatDate(oDatePicker.getDateValue());
				} else {
					sDate = String(oDatePicker.getValue() || '').trim();
				}
			}
			if (!sDate) {
				if (oDatePicker) {
					oDatePicker.setValueState('Error');
				}
				MessageToast.show(this._getText('msgScheduledDepartureDateRequired'));
				return;
			}
			if (oDatePicker) {
				oDatePicker.setValueState('None');
			}

			var aCodes = this._aPendingFlightOrderCodes || [];
			var aParams = [];
			if (aCodes.length) {
				aParams.push('LoadingDefinitionCode=' + encodeURIComponent(aCodes.join(';')));
			}
			aParams.push('ScheduledDepartureDate=' + encodeURIComponent(sDate));

			if (this._oSearchFlightOrderDialog) {
				this._oSearchFlightOrderDialog.close();
			}
			this._aPendingFlightOrderCodes = null;

			// Allow FLORD list to re-apply filters on every navigation
			this._sLastFilterSignature = '';
			HashChanger.getInstance().setHash(
				'ZC_PP_LDGRMP_FLORD' + (aParams.length ? '?' + aParams.join('&') : '')
			);
		},

		onCancelSearchFlightOrder: function () {
			this._aPendingFlightOrderCodes = null;
			if (this._oSearchFlightOrderDialog) {
				this._oSearchFlightOrderDialog.close();
			}
		},

		/**
		 * FLORD List: instance action SimulateAndCompare on ZC_PP_LDGRMP_FLORD
		 * (ZCL_PP_BP_LDGRMP_FLORD → facade FILL_FLORD_ITEM), then show Fragment.
		 */
		onSimulateAndCompare: async function () {
			var aContexts = this.base.getExtensionAPI().getSelectedContexts();
			if (!aContexts || !aContexts.length) {
				MessageToast.show(this._getText('msgSelectRowRequired'));
				return;
			}

			var oModel = this.base.getView().getModel();
			if (!oModel) {
				MessageBox.error(this._getText('msgSimulateAndCompareFailed', ['Model not available']));
				return;
			}

			this._setBusy(true);
			try {
				var aAllRows = [];
				for (var i = 0; i < aContexts.length; i++) {
					var oContext = aContexts[i];
					var oActionBinding = oModel.bindContext(
						ACTION_COMPARE_FQN + '(...)',
						oContext
					);
					await oActionBinding.execute();
					var oResult = await this._readActionResult(oActionBinding);
					aAllRows = aAllRows.concat(
						this._parseCompareResponse(oResult && oResult.Response)
					);
				}

				await this._openCompareResultDialog(aAllRows);
				MessageToast.show(this._getText('msgSimulateAndCompareSuccess', [aAllRows.length]));
			} catch (oError) {
				MessageBox.error(
					this._getText('msgSimulateAndCompareFailed', [this._extractErrorMessage(oError)])
				);
			} finally {
				this._setBusy(false);
			}
		},

		onCloseSimulateAndCompareDialog: function () {
			if (this._oCompareResultDialog) {
				this._oCompareResultDialog.close();
			}
		},

		/**
		 * @param {object[]} aRows
		 * @returns {Promise<void>}
		 * @private
		 */
		_openCompareResultDialog: async function (aRows) {
			var oView = this.base.getView();
			var oUiModel = oView.getModel('ui');
			if (!oUiModel) {
				oUiModel = new JSONModel({ compareItems: [] });
				oView.setModel(oUiModel, 'ui');
			}
			oUiModel.setProperty('/compareItems', aRows || []);

			if (!this._oCompareResultDialog) {
				if (!this._pCompareResultDialog) {
					this._pCompareResultDialog = Fragment.load({
						id: oView.getId(),
						name: 'com.cathaydining.zppe026.ext.fragment.SimulateAndCompareResultDialog',
						controller: this
					}).then(function (oDialog) {
						oView.addDependent(oDialog);
						this._oCompareResultDialog = oDialog;
						return oDialog;
					}.bind(this)).catch(function (oError) {
						this._pCompareResultDialog = null;
						this._oCompareResultDialog = null;
						throw oError;
					}.bind(this));
				}
				this._oCompareResultDialog = await this._pCompareResultDialog;
			}
			this._oCompareResultDialog.open();
		},

		/**
		 * @param {sap.ui.model.odata.v4.ODataContextBinding} oActionBinding
		 * @returns {Promise<object>}
		 * @private
		 */
		_readActionResult: async function (oActionBinding) {
			var oBoundContext = oActionBinding.getBoundContext();
			if (!oBoundContext) {
				return {};
			}
			if (typeof oBoundContext.requestObject === 'function') {
				return oBoundContext.requestObject() || {};
			}
			return oBoundContext.getObject() || {};
		},

		/**
		 * @param {string|object} vResponse
		 * @returns {object[]}
		 * @private
		 */
		_parseCompareResponse: function (vResponse) {
			if (vResponse === undefined || vResponse === null || vResponse === '') {
				return [];
			}
			var vParsed = vResponse;
			if (typeof vResponse === 'string') {
				try {
					vParsed = JSON.parse(vResponse);
				} catch (oError) {
					throw new Error(this._getText('msgInvalidSimulateResponse'));
				}
			}
			if (Array.isArray(vParsed)) {
				return vParsed;
			}
			if (vParsed && Array.isArray(vParsed.Items)) {
				return vParsed.Items;
			}
			return [];
		},

		/**
		 * @param {boolean} bBusy
		 * @private
		 */
		_setBusy: function (bBusy) {
			var oView = this.base.getView();
			if (oView && oView.setBusy) {
				oView.setBusy(!!bBusy);
			}
			if (bBusy) {
				if (!this._oBusyDialog) {
					this._oBusyDialog = new BusyDialog({
						text: this._getText('msgSimulateAndCompareInProgress')
					});
				}
				this._oBusyDialog.open();
			} else if (this._oBusyDialog) {
				this._oBusyDialog.close();
			}
		},

		/**
		 * @param {*} oError
		 * @returns {string}
		 * @private
		 */
		_extractErrorMessage: function (oError) {
			if (!oError) {
				return '';
			}
			if (typeof oError === 'string') {
				return oError;
			}
			if (oError.error && oError.error.message) {
				return oError.error.message;
			}
			if (oError.message) {
				return oError.message;
			}
			try {
				return JSON.stringify(oError);
			} catch (oIgnore) {
				return String(oError);
			}
		},

		/**
		 * @returns {Promise<sap.m.Dialog>}
		 * @private
		 */
		_getSearchFlightOrderDialog: function () {
			var oView = this.base.getView();

			if (this._oSearchFlightOrderDialog && !this._oSearchFlightOrderDialog.bIsDestroyed) {
				return Promise.resolve(this._oSearchFlightOrderDialog);
			}
			if (this._oSearchFlightOrderDialog && this._oSearchFlightOrderDialog.bIsDestroyed) {
				this._oSearchFlightOrderDialog = null;
				this._pSearchFlightOrderDialog = null;
			}

			if (!this._pSearchFlightOrderDialog) {
				this._pSearchFlightOrderDialog = Fragment.load({
					id: oView.getId(),
					name: 'com.cathaydining.zppe026.ext.fragment.SearchFlightOrderDialog',
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					this._oSearchFlightOrderDialog = oDialog;
					return oDialog;
				}.bind(this)).catch(function (oError) {
					this._pSearchFlightOrderDialog = null;
					this._oSearchFlightOrderDialog = null;
					throw oError;
				}.bind(this));
			}
			return this._pSearchFlightOrderDialog;
		},

		/**
		 * Apply filter fields from route/hash query to the current List Report filter bar.
		 * @param {object|null} oRouteQuery Route query from routeMatched
		 * @private
		 */
		_applyQueryFilters: async function (oRouteQuery) {
			if (this._bApplyingFilters || !this._oPageFilter) {
				return;
			}

			var oDesired = this._getQueryParams(oRouteQuery);
			if (!oDesired) {
				return;
			}

			var sSignature = JSON.stringify(oDesired);
			if (sSignature === this._sLastFilterSignature) {
				return;
			}

			this._bApplyingFilters = true;
			try {
				var oAPI = this.base.getExtensionAPI();
				if (!oAPI || typeof oAPI.setFilterValues !== 'function') {
					return;
				}

				await this._waitForFilterBar();

				var aFilterFields = this._oPageFilter.fields;
				for (var i = 0; i < aFilterFields.length; i++) {
					await oAPI.setFilterValues(aFilterFields[i]);
				}

				var aKeys = Object.keys(oDesired);
				for (var j = 0; j < aKeys.length; j++) {
					var sField = aKeys[j];
					var sRaw = oDesired[sField];
					if (!sRaw) {
						continue;
					}

					if (sField === 'ScheduledDepartureDate' || sField === 'StdDate') {
						var sDateRaw = String(sRaw);
						if (sDateRaw.indexOf('...') >= 0) {
							var aRange = sDateRaw.split('...');
							if (aRange[0] && aRange[1]) {
								await oAPI.setFilterValues(sField, 'BT', aRange[0], aRange[1]);
							}
							continue;
						}
					}

					var aValues = this._splitValues(sRaw);
					if (!aValues.length) {
						continue;
					}
					await oAPI.setFilterValues(
						sField,
						'EQ',
						aValues.length === 1 ? aValues[0] : aValues
					);
				}

				this._sLastFilterSignature = sSignature;

				var oFilterBar = this._findFilterBar();
				if (oFilterBar && typeof oFilterBar.triggerSearch === 'function') {
					oFilterBar.triggerSearch();
				}
			} catch (oError) {
				this._sLastFilterSignature = '';
				Log.error(
					'Could not apply List Report filters',
					oError,
					'com.cathaydining.zppe026'
				);
			} finally {
				this._bApplyingFilters = false;
			}
		},

		/**
		 * @param {object|null} oRouteQuery Route query
		 * @returns {object|null}
		 * @private
		 */
		_getQueryParams: function (oRouteQuery) {
			var oHash = this._getQueryParamsFromHash() || {};
			var oSource = Object.assign(
				{},
				oHash,
				oRouteQuery && typeof oRouteQuery === 'object' ? oRouteQuery : {}
			);
			var oDesired = {};
			var aFilterFields = this._oPageFilter.fields;

			aFilterFields.forEach(function (sKey) {
				var sValue = oSource[sKey];
				if (sValue) {
					oDesired[sKey] = sValue;
				}
			});

			return Object.keys(oDesired).length ? oDesired : null;
		},

		/**
		 * @returns {object|null}
		 * @private
		 */
		_getQueryParamsFromHash: function () {
			var sHash = HashChanger.getInstance().getHash() || '';
			var iQ = sHash.indexOf('?');
			if (iQ < 0) {
				return null;
			}
			if (sHash.indexOf(this._oPageFilter.entity) !== 0) {
				return null;
			}

			var oParams = {};
			sHash.substring(iQ + 1).split('&').forEach(function (sPart) {
				var iEq = sPart.indexOf('=');
				if (iEq < 0) {
					return;
				}
				var sKey = decodeURIComponent(sPart.substring(0, iEq));
				var sValue = decodeURIComponent(sPart.substring(iEq + 1));
				if (sKey.indexOf('sap-') === 0) {
					return;
				}
				oParams[sKey] = sValue;
			});
			return oParams;
		},

		/**
		 * @param {string} sValue Raw value
		 * @returns {string[]}
		 * @private
		 */
		_splitValues: function (sValue) {
			if (sValue === undefined || sValue === null || sValue === '') {
				return [];
			}
			return String(sValue)
				.split(/[;,]/)
				.map(function (sPart) {
					return sPart.trim();
				})
				.filter(Boolean);
		},

		/**
		 * @param {Date} oDate Date value
		 * @returns {string} yyyy-MM-dd
		 * @private
		 */
		_formatDate: function (oDate) {
			if (!(oDate instanceof Date) || isNaN(oDate.getTime())) {
				return '';
			}
			var iYear = oDate.getFullYear();
			var sMonth = ('0' + (oDate.getMonth() + 1)).slice(-2);
			var sDay = ('0' + oDate.getDate()).slice(-2);
			return iYear + '-' + sMonth + '-' + sDay;
		},

		/**
		 * @param {string} sKey i18n key
		 * @returns {string}
		 * @private
		 */
		_getText: function (sKey, aArgs) {
			var oView = this.base.getView();
			var oModel = oView.getModel('@i18n') || oView.getModel('i18n');
			if (oModel && typeof oModel.getResourceBundle === 'function') {
				return oModel.getResourceBundle().getText(sKey, aArgs);
			}
			return sKey;
		},

		/**
		 * @returns {sap.ui.mdc.FilterBar|null}
		 * @private
		 */
		_findFilterBar: function () {
			return this.base.getView().findAggregatedObjects(true, function (oControl) {
				return oControl.isA('sap.ui.mdc.FilterBar');
			})[0] || null;
		},

		/**
		 * @returns {Promise}
		 * @private
		 */
		_waitForFilterBar: async function () {
			for (var i = 0; i < 40; i++) {
				var oFilterBar = this._findFilterBar();
				if (oFilterBar) {
					if (typeof oFilterBar.initialized === 'function') {
						await oFilterBar.initialized();
					}
					return oFilterBar;
				}
				await new Promise(function (fnResolve) {
					setTimeout(fnResolve, 100);
				});
			}
			return null;
		}
	});
});
