sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox'
], function (ControllerExtension, MessageBox) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zewme004.ext.controller.ListReportExtension', {
		override: {
			onInit: function () {
				this._iLastTabSwitchAt = 0;
			},

			routing: {
				onAfterBinding: function () {
					var oFilterBar = this._findFilterBar();
					var oTab = sap.ui.getCore().byId('com.cathaydining.zewme004::ZC_EWM_RELOCDOCList--fe::TabMultipleMode');

					if (oFilterBar) {
						oFilterBar.detachSearch(this._onSearch, this);
						oFilterBar.attachSearch(this._onSearch, this);
					}

					if (oTab) {
						oTab.detachSelect(this._onTabSelect, this);
						oTab.attachSelect(this._onTabSelect, this);
						this._updateCreatedOnRequired(oTab.getSelectedKey());
						return;
					}

					this._updateCreatedOnRequired();
				}
			}
		},

		_onTabSelect: function (oEvent) {
			this._iLastTabSwitchAt = Date.now();
			this._updateCreatedOnRequired(oEvent.getSource().getSelectedKey());
		},

		_updateCreatedOnRequired: function (sSelectedKey) {
			var oCreatedOnField = this._findCreatedOnField();

			if (!oCreatedOnField) {
				return;
			}

			if (typeof oCreatedOnField.setRequired === 'function') {
				oCreatedOnField.setRequired(sSelectedKey === 'fe::table::ZC_EWM_RELOCDOC::LineItem');
			}

			this._applyDefaultCreatedOn(oCreatedOnField);

			if (sSelectedKey !== 'fe::table::ZC_EWM_RELOCDOC::LineItem' && typeof oCreatedOnField.setValueState === 'function') {
				oCreatedOnField.setValueState('None');
			}
		},

		_findFilterBar: function () {
			var oView = this.base.getView();
			var aControls = oView.findAggregatedObjects(true, function (oControl) {
				return oControl && typeof oControl.attachSearch === 'function' && typeof oControl.detachSearch === 'function';
			});

			return aControls && aControls[0] ? aControls[0] : null;
		},

		_applyDefaultCreatedOn: function (oField) {
			if (!oField || this._getCreatedOnValue(oField)) {
				return;
			}

			if (typeof oField.setDateValue === 'function') {
				oField.setDateValue(new Date());
				return;
			}

			if (typeof oField.setValue === 'function') {
				oField.setValue(this._getTodayString());
				return;
			}

			if (typeof oField.setConditions === 'function') {
				oField.setConditions([{
					operator: 'EQ',
					values: [this._getTodayString()]
				}]);
			}
		},

		_onSearch: function (oEvent) {
			var oCreatedOnField = this._findCreatedOnField();
			var vValue;

			if (Date.now() - this._iLastTabSwitchAt < 800) {
				return;
			}

			if (!oCreatedOnField || typeof oCreatedOnField.getRequired !== 'function' || !oCreatedOnField.getRequired()) {
				return;
			}

			vValue = this._getCreatedOnValue(oCreatedOnField);
			if (vValue) {
				if (typeof oCreatedOnField.setValueState === 'function') {
					oCreatedOnField.setValueState('None');
				}
				return;
			}

			if (typeof oEvent.preventDefault === 'function') {
				oEvent.preventDefault();
			}

			if (typeof oCreatedOnField.setValueState === 'function') {
				oCreatedOnField.setValueState('Error');
			}

			if (typeof oCreatedOnField.setValueStateText === 'function') {
				oCreatedOnField.setValueStateText('Creation Date is required.');
			}

			MessageBox.warning('Creation Date is required.');
		},

		_findCreatedOnField: function () {
			var oView = this.base.getView();
			var aControls = oView.findAggregatedObjects(true, function (oControl) {
				if (!oControl) {
					return false;
				}

				if (typeof oControl.getFieldPath === 'function' && oControl.getFieldPath() === 'CreatedOn') {
					return true;
				}

				if (typeof oControl.getPropertyKey === 'function' && oControl.getPropertyKey() === 'CreatedOn') {
					return true;
				}

				return false;
			});
			var oField = aControls && aControls[0];

			if (!oField) {
				return null;
			}

			if (typeof oField.setRequired === 'function') {
				return oField;
			}

			var aInnerControls = oField.findAggregatedObjects ? oField.findAggregatedObjects(true, function (oInnerControl) {
				return oInnerControl && typeof oInnerControl.setRequired === 'function';
			}) : [];

			return aInnerControls && aInnerControls[0] ? aInnerControls[0] : oField;
		},

		_getCreatedOnValue: function (oField) {
			if (typeof oField.getValue === 'function') {
				return oField.getValue();
			}

			if (typeof oField.getDateValue === 'function') {
				return oField.getDateValue();
			}

			if (typeof oField.getConditions === 'function') {
				var aConditions = oField.getConditions();
				return aConditions && aConditions.length ? aConditions : null;
			}

			return null;
		},

		_getTodayString: function () {
			var oToday = new Date();
			var sMonth = String(oToday.getMonth() + 1).padStart(2, '0');
			var sDay = String(oToday.getDate()).padStart(2, '0');

			return oToday.getFullYear() + '-' + sMonth + '-' + sDay;
		},


		onNavWtAssignment: function () {
			sap.ushell.Container.getService("Navigation").navigate({
				target: {
					semanticObject: "ZWTAssign",
					action: "maintain"
				}
			});
		}


	});
});
