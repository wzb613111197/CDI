sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"sap/ui/core/routing/HashChanger",
	"sap/m/MessageToast"
], function (Controller, Fragment, HashChanger, MessageToast) {
	"use strict";

	return Controller.extend("com.cathaydining.zppe026.ext.controller.Home", {

		onExecute: async function () {
			var oRadioGroup = this.byId("optionGroup");
			var iSelectedIndex = oRadioGroup.getSelectedIndex();

			if (iSelectedIndex === 0) {
				HashChanger.getInstance().setHash("ZC_PP_LDGRMP_HDR");
				return;
			}

			if (iSelectedIndex === 1) {
				// Option 02: collect Airline / Flight / Date before navigating
				var oDialog = await this._getSimulateParamsDialog();
				this._resetSimulateParamsDialog();
				oDialog.open();
			}
		},

		onDlgAirlineCodeChange: function (oEvent) {
			var sValue = (oEvent.getParameter("value") || "").toUpperCase();
			oEvent.getSource().setValue(sValue);
		},

		onConfirmSimulateFlightParams: function () {
			var oView = this.getView();
			var oAirline = oView.byId("dlgAirlineCodeInput");
			var oFlight = oView.byId("dlgFlightNumberInput");
			var oDate = oView.byId("dlgSimulationDatePicker");

			var sAirline = ((oAirline && oAirline.getValue()) || "").trim().toUpperCase();
			var sFlight = ((oFlight && oFlight.getValue()) || "").trim();
			var sDate = ((oDate && oDate.getValue()) || "").trim();

			if (!sAirline || !sFlight || !sDate) {
				MessageToast.show(this._getText("msgSimulateInputRequired"));
				return;
			}

			if (this._oSimulateParamsDialog) {
				this._oSimulateParamsDialog.close();
			}

			var aParams = [
				"AirlineCode=" + encodeURIComponent(sAirline),
				"FlightNumber=" + encodeURIComponent(sFlight),
				"SimulationDate=" + encodeURIComponent(sDate)
			];
			HashChanger.getInstance().setHash("SimulateSpecificFlight?" + aParams.join("&"));
		},

		onCancelSimulateFlightParams: function () {
			if (this._oSimulateParamsDialog) {
				this._oSimulateParamsDialog.close();
			}
		},

		/**
		 * @returns {Promise<sap.m.Dialog>}
		 * @private
		 */
		_getSimulateParamsDialog: function () {
			var oView = this.getView();
			if (this._oSimulateParamsDialog && !this._oSimulateParamsDialog.bIsDestroyed) {
				return Promise.resolve(this._oSimulateParamsDialog);
			}
			if (!this._pSimulateParamsDialog) {
				this._pSimulateParamsDialog = Fragment.load({
					id: oView.getId(),
					name: "com.cathaydining.zppe026.ext.fragment.SimulateFlightParamsDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					this._oSimulateParamsDialog = oDialog;
					return oDialog;
				}.bind(this)).catch(function (oError) {
					this._pSimulateParamsDialog = null;
					this._oSimulateParamsDialog = null;
					throw oError;
				}.bind(this));
			}
			return this._pSimulateParamsDialog;
		},

		/**
		 * @private
		 */
		_resetSimulateParamsDialog: function () {
			var oView = this.getView();
			var oAirline = oView.byId("dlgAirlineCodeInput");
			var oFlight = oView.byId("dlgFlightNumberInput");
			var oDate = oView.byId("dlgSimulationDatePicker");
			if (oAirline) {
				oAirline.setValue("");
			}
			if (oFlight) {
				oFlight.setValue("");
			}
			if (oDate) {
				oDate.setValue("");
			}
		},

		/**
		 * @param {string} sKey
		 * @returns {string}
		 * @private
		 */
		_getText: function (sKey) {
			var oModel = this.getView().getModel("@i18n") || this.getView().getModel("i18n");
			var oBundle = oModel && oModel.getResourceBundle && oModel.getResourceBundle();
			if (oBundle && oBundle.getText) {
				return oBundle.getText(sKey);
			}
			return sKey;
		}
	});
});
