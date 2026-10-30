sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/MessageToast'
], function (ControllerExtension, MessageBox, MessageToast) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zppe021.ext.controller.ListReportExtension', {

		_pendingChanges: null,

		override: {
			onInit: function () {
			}
		},
	});
});
