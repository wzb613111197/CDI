sap.ui.define([
	"sap/ui/core/mvc/ControllerExtension",
	"sap/ui/core/Element",
	"sap/ui/core/ElementRegistry",
	"sap/ui/mdc/condition/Condition"
], function (ControllerExtension, Element, ElementRegistry, Condition) {
	"use strict";

	var ALLOWED_FILE_TYPES = ["pdf"];
	var ALLOWED_MIME_TYPES = ["application/pdf"];
	var MAX_ATTEMPTS = 20;
	var RETRY_DELAY = 500;

	var VH_RANGE_PROPERTY = "ZstdDate";
	var LOCAL_FROM_PROPERTY = "ZvalidFrom";
	var LOCAL_TO_PROPERTY = "ZvalidTo";

	function restrictControl(oControl) {
		if (!oControl || !oControl.isA) {
			return false;
		}

		if (oControl.isA("sap.m.upload.UploadSet") || oControl.isA("sap.m.upload.UploadSetwithTable")) {
			oControl.setFileTypes(ALLOWED_FILE_TYPES);
			return true;
		}

		if (oControl.isA("sap.m.UploadCollection") || oControl.isA("sap.ui.unified.FileUploader")) {
			oControl.setFileType(ALLOWED_FILE_TYPES);
			oControl.setMimeType(ALLOWED_MIME_TYPES);
			return true;
		}

		return false;
	}

	function isFlightNumberMainField(oControl) {
		var sId = oControl.getId();
		return sId && sId.indexOf("DataField::_ci_smt::ZfltNum") !== -1 && sId.indexOf("::Dialog::") === -1;
	}

	function applyDateRange(oField, oView, oValueHelp) {

		function readDates(oCtx) {
			if (!oCtx) {
				return null;
			}
			var sFrom = oCtx.getProperty(LOCAL_FROM_PROPERTY) || oCtx.getProperty("_crew_info/" + LOCAL_FROM_PROPERTY);
			var sTo = oCtx.getProperty(LOCAL_TO_PROPERTY) || oCtx.getProperty("_crew_info/" + LOCAL_TO_PROPERTY);
			return sFrom && sTo ? { from: sFrom, to: sTo } : null;
		}

		var oFieldCtx = oField && oField.getBindingContext ? oField.getBindingContext() : null;
		var oViewCtx = oView && oView.getBindingContext ? oView.getBindingContext() : null;

		var oDates = readDates(oFieldCtx) || readDates(oViewCtx);
		if (!oDates) {
			return;
		}

		var sFrom = oDates.from;
		var sTo = oDates.to;

		function toUtcDate(sDate) {
			return new Date(sDate + "T00:00:00Z");
		}

		var oCondition = Condition.createCondition("BT", [toUtcDate(sFrom), toUtcDate(sTo)], undefined, undefined, "NotValidated");
		var aConditions = [oCondition];

		function applyConditionsToFilterField(oControl) {
			if (!oControl || !oControl.setConditions) {
				return;
			}
			oControl.setConditions(aConditions);
			if (oControl.invalidate) {
				oControl.invalidate();
			}
			if (oControl.getParent && oControl.getParent() && oControl.getParent().invalidate) {
				oControl.getParent().invalidate();
			}
		}

		function findAndApplyToZstdDate(oContent) {
			var oFilterBar = oContent && oContent.getFilterBar && oContent.getFilterBar();
			if (!oFilterBar || !oFilterBar.getFilterItems) {
				return;
			}
			oFilterBar.getFilterItems().forEach(function (oFilterItem) {
				if (!oFilterItem || !oFilterItem.isA) {
					return;
				}
				var sKey = oFilterItem.getPropertyKey && oFilterItem.getPropertyKey();
				if (sKey === VH_RANGE_PROPERTY || (oFilterItem.getFieldPath && oFilterItem.getFieldPath() === VH_RANGE_PROPERTY)) {
					applyConditionsToFilterField(oFilterItem);
				}
			});
		}

		function applyToValueHelpDialog() {
			var oDialog = oValueHelp.getDialog && oValueHelp.getDialog();
			if (oDialog && oDialog.getContent) {
				oDialog.getContent().forEach(findAndApplyToZstdDate);
			}
		}

		applyToValueHelpDialog();
		setTimeout(applyToValueHelpDialog, 1000);
	}

	function hookFlightNumberValueHelps(oView) {
		var bFound = false;

		ElementRegistry.forEach(function (oElement) {
			if (!oElement.isA || !oElement.isA("sap.ui.mdc.field.FieldBase")) {
				return;
			}
			if (!isFlightNumberMainField(oElement)) {
				return;
			}

			var sValueHelpId = oElement.getValueHelp && oElement.getValueHelp();
			var oValueHelp = sValueHelpId && Element.getElementById(sValueHelpId);
			if (!oValueHelp || !oValueHelp.attachOpen) {
				return;
			}

			bFound = true;
			if (oValueHelp._zppf004RangeHooked) {
				return;
			}

			oValueHelp._zppf004RangeHooked = true;
			oValueHelp.attachOpen(applyDateRange.bind(null, oElement, oView, oValueHelp));
		});

		return bFound;
	}

	function applyRestrictions(oView, iAttempt) {
		var bFound = false;

		ElementRegistry.forEach(function (oElement) {
			if (restrictControl(oElement)) {
				bFound = true;
			}
		});

		var bValueHelpFound = hookFlightNumberValueHelps(oView);

		if ((!bFound || !bValueHelpFound) && iAttempt < MAX_ATTEMPTS) {
			setTimeout(applyRestrictions.bind(null, oView, iAttempt + 1), RETRY_DELAY);
		}
	}

	return ControllerExtension.extend("com.cathaydining.zppf004.ext.controller.ObjectPageExtension", {
		override: {
			onAfterRendering: function () {
				applyRestrictions(this.base.getView(), 0);
			},

			routing: {
				onAfterBinding: function () {
					applyRestrictions(this.base.getView(), 0);
				}
			}
		}
	});
});
