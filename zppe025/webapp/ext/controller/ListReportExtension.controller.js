sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/ui/mdc/p13n/StateUtil'
], function (ControllerExtension, MessageBox, MessageToast, StateUtil) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zppe025.ext.controller.ListReportExtension', {

		override: {
			// onAfterRendering: function () {
			// 	this._setDefaultFilters();
			// }
		},

		_setDefaultFilters: async function () {
			var oView = this.base.getView();
			var oFilterBar = oView.findAggregatedObjects(true, function (oControl) {
				return oControl.isA('sap.ui.mdc.FilterBar');
			})[0];

			if (!oFilterBar || this._bDefaultFiltersApplied) {
				return;
			}

			this._bDefaultFiltersApplied = true;
			var oState = await StateUtil.retrieveExternalState(oFilterBar);
			var mFilter = oState.filter || {};

			if (!mFilter.ValidFrom || !mFilter.ValidFrom.length) {
				var oToday = new Date();
				var sToday = oToday.getFullYear() + '-' + String(oToday.getMonth() + 1).padStart(2, '0') + '-' + String(oToday.getDate()).padStart(2, '0');

				var oFuture = new Date(oToday.getTime() + 180 * 24 * 60 * 60 * 1000);
				var sFuture = oFuture.getFullYear() + '-' + String(oFuture.getMonth() + 1).padStart(2, '0') + '-' + String(oFuture.getDate()).padStart(2, '0');

				mFilter.ValidFrom = [{ operator: 'EQ', values: [sToday] }];
				mFilter.ValidTo = [{ operator: 'EQ', values: [sFuture] }];
				await StateUtil.applyExternalState(oFilterBar, { filter: mFilter });
			}
		}
	});
});
