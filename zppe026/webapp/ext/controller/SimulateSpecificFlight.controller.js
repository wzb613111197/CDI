sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/m/BusyDialog",
	"sap/ui/core/routing/HashChanger"
], function (Controller, Fragment, JSONModel, MessageBox, MessageToast, BusyDialog, HashChanger) {
	"use strict";

	var ACTION_SIMULATE_FQN =
		"com.sap.gateway.srvd.zpp_pp_ldgrmp_hdr.v0001.SimulateSpecificFlight";
	var ACTION_CONFIRM_FQN =
		"com.sap.gateway.srvd.zpp_pp_ldgrmp_hdr.v0001.SimulateSpecificFlightConfirm";

	return Controller.extend("com.cathaydining.zppe026.ext.controller.SimulateSpecificFlight", {

		onInit: function () {
			this.getView().setModel(new JSONModel({
				airlineCode: "",
				flightNumber: "",
				simulationDate: "",
				paramSummary: "",
				busy: false,
				hasResults: false,
				results: [],
				confirmItems: [],
				confirmDistribution: []
			}), "ui");

			this._applyQueryParamsFromHash();
			this._fnFitTable = this._fitTableToViewport.bind(this);
			this.getView().addEventDelegate({
				onAfterRendering: this._scheduleFitTable
			}, this);
			window.addEventListener("resize", this._fnFitTable);

			// Auto-load master data (Confirm=false) after params from Home dialog
			setTimeout(function () {
				this._executeSimulate();
			}.bind(this), 0);
		},

		/**
		 * Defer fit until DynamicPage layout has settled.
		 * @private
		 */
		_scheduleFitTable: function () {
			if (this._iFitTimer) {
				clearTimeout(this._iFitTimer);
			}
			this._iFitTimer = setTimeout(function () {
				this._iFitTimer = null;
				this._fitTableToViewport();
			}.bind(this), 50);
		},

		onExit: function () {
			if (this._iFitTimer) {
				clearTimeout(this._iFitTimer);
				this._iFitTimer = null;
			}
			if (this._fnFitTable) {
				window.removeEventListener("resize", this._fnFitTable);
				this._fnFitTable = null;
			}
			if (this._oConfirmResultDialog) {
				this._oConfirmResultDialog.destroy();
				this._oConfirmResultDialog = null;
			}
			if (this._oBusyDialog) {
				this._oBusyDialog.destroy();
				this._oBusyDialog = null;
			}
		},

		onAfterRendering: function () {
			this._scheduleFitTable();
		},

		onConfirm: async function () {
			await this._executeConfirm();
		},

		onCloseConfirmResultDialog: function () {
			if (this._oConfirmResultDialog) {
				this._oConfirmResultDialog.close();
			}
		},

		/**
		 * Prefill filter fields from hash query (passed when leaving Home).
		 * @private
		 */
		_applyQueryParamsFromHash: function () {
			var sHash = HashChanger.getInstance().getHash() || "";
			var iQ = sHash.indexOf("?");
			if (iQ < 0) {
				this._refreshParamSummary();
				return;
			}
			var oUiModel = this._getUiModel();
			sHash.substring(iQ + 1).split("&").forEach(function (sPart) {
				var iEq = sPart.indexOf("=");
				if (iEq < 0) {
					return;
				}
				var sKey = decodeURIComponent(sPart.substring(0, iEq));
				var sValue = decodeURIComponent(sPart.substring(iEq + 1) || "");
				if (sKey === "AirlineCode") {
					oUiModel.setProperty("/airlineCode", sValue.toUpperCase());
				} else if (sKey === "FlightNumber") {
					oUiModel.setProperty("/flightNumber", sValue);
				} else if (sKey === "SimulationDate") {
					oUiModel.setProperty("/simulationDate", sValue);
				}
			});
			this._refreshParamSummary();
		},

		/**
		 * Compact subtitle under page title (params come from Home dialog).
		 * @private
		 */
		_refreshParamSummary: function () {
			var oUiModel = this._getUiModel();
			var aParts = [
				oUiModel.getProperty("/airlineCode"),
				oUiModel.getProperty("/flightNumber"),
				oUiModel.getProperty("/simulationDate")
			].filter(Boolean);
			oUiModel.setProperty("/paramSummary", aParts.join("  ·  "));
		},

		/**
		 * Grow the grid table to fill remaining viewport under title/footer.
		 * Uses Fixed rowMode + explicit pixel height so Auto/CSS % cannot collapse it.
		 * @private
		 */
		_fitTableToViewport: function () {
			var oTable = this.byId("simulateResultTable");
			if (!oTable || !oTable.getDomRef()) {
				return;
			}
			var oPage = this.byId("simulateSpecificFlightPage");
			var oFooter = oPage && oPage.getDomRef("footer");
			var iFooter = oFooter ? oFooter.offsetHeight : 48;
			var oRect = oTable.getDomRef().getBoundingClientRect();
			var iAvailable = Math.floor(window.innerHeight - oRect.top - iFooter - 8);
			if (iAvailable < 320) {
				iAvailable = 320;
			}

			oTable.setHeight(iAvailable + "px");

			var iRowHeight = oTable.getRowHeight() || 33;
			var iHeader = (oTable.getColumnHeaderHeight && oTable.getColumnHeaderHeight()) || 36;
			var oExt = oTable.getExtension && oTable.getExtension();
			var iToolbar = 0;
			if (oExt && oExt.length) {
				oExt.forEach(function (oCtrl) {
					var oDom = oCtrl.getDomRef && oCtrl.getDomRef();
					iToolbar += oDom ? oDom.offsetHeight : 40;
				});
			} else {
				iToolbar = 40;
			}
			var iRows = Math.floor((iAvailable - iHeader - iToolbar - 4) / iRowHeight);
			if (iRows < 8) {
				iRows = 8;
			}
			var oRowMode = oTable.getRowMode && oTable.getRowMode();
			if (oRowMode && typeof oRowMode.setRowCount === "function") {
				oRowMode.setRowCount(iRows);
			} else if (typeof oTable.setVisibleRowCount === "function") {
				oTable.setVisibleRowCount(iRows);
			}
		},

		/**
		 * Master data retrieval via SimulateSpecificFlight (IV_CONFIRM = false).
		 * @param {boolean} bConfirm unused (always false for this path)
		 * @private
		 */
		_executeSimulate: async function () {
			var oUiModel = this._getUiModel();
			if (oUiModel.getProperty("/busy")) {
				return;
			}

			var oPayload = this._buildRequestPayload();
			if (!oPayload) {
				return;
			}

			var oModel = this.getView().getModel();
			if (!oModel) {
				MessageBox.error(this._getText("msgSimulateFailed", ["Model not available"]));
				return;
			}

			this._setBusy(true);
			try {
				var oActionBinding = oModel.bindContext(
					"/ZC_PP_LDGRMP_HDR/" + ACTION_SIMULATE_FQN + "(...)"
				);
				oActionBinding.setParameter("Request", JSON.stringify(oPayload));

				await oActionBinding.execute();
				var oResult = await this._readActionResult(oActionBinding);
				var aRows = this._parseResponseRows(oResult && oResult.Response);

				oUiModel.setProperty("/results", aRows);
				oUiModel.setProperty("/hasResults", aRows.length > 0);
				var oTable = this.byId("simulateResultTable");
				if (oTable && oTable.clearSelection) {
					oTable.clearSelection();
				}

				MessageToast.show(this._getText("msgSimulateSuccess", [aRows.length]));
			} catch (oError) {
				MessageBox.error(this._getText("msgSimulateFailed", [this._extractErrorMessage(oError)]));
			} finally {
				this._setBusy(false);
				this._scheduleFitTable();
			}
		},

		/**
		 * Confirm via SimulateSpecificFlightConfirm (IV_CONFIRM = true) → Fragment.
		 * @private
		 */
		_executeConfirm: async function () {
			var oUiModel = this._getUiModel();
			if (oUiModel.getProperty("/busy")) {
				return;
			}

			var oPayload = this._buildRequestPayload();
			if (!oPayload) {
				return;
			}

			var oModel = this.getView().getModel();
			if (!oModel) {
				MessageBox.error(this._getText("msgSimulateFailed", ["Model not available"]));
				return;
			}

			this._setBusy(true);
			try {
				var oActionBinding = oModel.bindContext(
					"/ZC_PP_LDGRMP_HDR/" + ACTION_CONFIRM_FQN + "(...)"
				);
				oActionBinding.setParameter("Request", JSON.stringify(oPayload));

				await oActionBinding.execute();
				var oResult = await this._readActionResult(oActionBinding);
				var oParsed = this._parseConfirmResponse(oResult && oResult.Response);

				oUiModel.setProperty("/confirmItems", oParsed.items);
				oUiModel.setProperty("/confirmDistribution", oParsed.distribution);

				await this._openConfirmResultDialog();
				MessageToast.show(this._getText("msgSimulateConfirmSuccess"));
			} catch (oError) {
				MessageBox.error(this._getText("msgSimulateFailed", [this._extractErrorMessage(oError)]));
			} finally {
				this._setBusy(false);
			}
		},

		/**
		 * @param {boolean} bConfirm
		 * @returns {object|null}
		 * @private
		 */
		_buildRequestPayload: function () {
			var oUiModel = this._getUiModel();
			var sAirline = String(oUiModel.getProperty("/airlineCode") || "").trim().toUpperCase();
			var sFlight = String(oUiModel.getProperty("/flightNumber") || "").trim();
			var sDate = String(oUiModel.getProperty("/simulationDate") || "").trim();

			if (!sAirline || !sFlight || !sDate) {
				MessageBox.error(this._getText("msgSimulateInputRequired"));
				return null;
			}

			return {
				AirlineCode: sAirline,
				FlightNumber: sFlight,
				SimulationDate: sDate
			};
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
			if (typeof oBoundContext.requestObject === "function") {
				return oBoundContext.requestObject() || {};
			}
			return oBoundContext.getObject() || {};
		},

		/**
		 * @param {string|object} vResponse
		 * @returns {object[]}
		 * @private
		 */
		_parseResponseRows: function (vResponse) {
			if (vResponse === undefined || vResponse === null || vResponse === "") {
				return [];
			}

			var vParsed = vResponse;
			if (typeof vResponse === "string") {
				try {
					vParsed = JSON.parse(vResponse);
				} catch (oError) {
					throw new Error(this._getText("msgInvalidSimulateResponse"));
				}
			}

			if (Array.isArray(vParsed)) {
				return vParsed;
			}
			if (vParsed && Array.isArray(vParsed.Items)) {
				return vParsed.Items;
			}
			if (vParsed && Array.isArray(vParsed.results)) {
				return vParsed.results;
			}
			if (vParsed && Array.isArray(vParsed.value)) {
				return vParsed.value;
			}
			if (vParsed && typeof vParsed === "object") {
				return [vParsed];
			}
			return [];
		},

		/**
		 * @param {string|object} vResponse
		 * @returns {{items: object[], distribution: object[]}}
		 * @private
		 */
		_parseConfirmResponse: function (vResponse) {
			var oEmpty = { items: [], distribution: [] };
			if (vResponse === undefined || vResponse === null || vResponse === "") {
				return oEmpty;
			}

			var vParsed = vResponse;
			if (typeof vResponse === "string") {
				try {
					vParsed = JSON.parse(vResponse);
				} catch (oError) {
					throw new Error(this._getText("msgInvalidSimulateResponse"));
				}
			}

			if (!vParsed || typeof vParsed !== "object") {
				return oEmpty;
			}

			return {
				items: Array.isArray(vParsed.Items) ? vParsed.Items : [],
				distribution: Array.isArray(vParsed.Distribution) ? vParsed.Distribution : []
			};
		},

		/**
		 * @returns {Promise<void>}
		 * @private
		 */
		_openConfirmResultDialog: async function () {
			if (!this._oConfirmResultDialog) {
				this._oConfirmResultDialog = await Fragment.load({
					id: this.getView().getId(),
					name: "com.cathaydining.zppe026.ext.fragment.SimulateConfirmResultDialog",
					controller: this
				});
				this.getView().addDependent(this._oConfirmResultDialog);
			}
			this._oConfirmResultDialog.open();
		},

		/**
		 * @param {boolean} bBusy
		 * @private
		 */
		_setBusy: function (bBusy) {
			this._getUiModel().setProperty("/busy", !!bBusy);
			var oPage = this.byId("simulateSpecificFlightPage");
			if (oPage && oPage.setBusy) {
				oPage.setBusy(!!bBusy);
			}
			if (bBusy) {
				if (!this._oBusyDialog) {
					this._oBusyDialog = new BusyDialog({
						text: this._getText("msgSimulateInProgress")
					});
				}
				this._oBusyDialog.open();
			} else if (this._oBusyDialog) {
				this._oBusyDialog.close();
			}
		},

		/**
		 * @returns {sap.ui.model.json.JSONModel}
		 * @private
		 */
		_getUiModel: function () {
			return this.getView().getModel("ui");
		},

		/**
		 * @param {string} sKey
		 * @param {string[]} [aArgs]
		 * @returns {string}
		 * @private
		 */
		_getText: function (sKey, aArgs) {
			var oModel = this.getView().getModel("@i18n") || this.getView().getModel("i18n");
			var oBundle = oModel && oModel.getResourceBundle && oModel.getResourceBundle();
			if (oBundle && oBundle.getText) {
				return oBundle.getText(sKey, aArgs);
			}
			return sKey;
		},

		/**
		 * @param {*} oError
		 * @returns {string}
		 * @private
		 */
		_extractErrorMessage: function (oError) {
			if (!oError) {
				return "";
			}
			if (typeof oError === "string") {
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
		}
	});
});
