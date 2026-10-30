sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/m/MessageBox',
	'sap/m/Dialog',
	'sap/m/Button',
	'sap/m/Label',
	'sap/m/ComboBox',
	'sap/ui/core/Item',
	'sap/ui/core/HTML',
	'sap/ui/layout/form/SimpleForm',
	'sap/ui/mdc/p13n/StateUtil',
	'sap/m/DynamicDateUtil',
	'sap/m/MessageToast'
], function (ControllerExtension, MessageBox, Dialog, Button, Label, ComboBox, Item, HTML, SimpleForm, StateUtil, DynamicDateUtil, MessageToast) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zewme002.inbgr.ext.controller.ListReportExtension', {
		override: {
			onInit: function () {
				this._mEditedQty = {};
			}
		},

		// Input change 事件：把 Key (Vbeln/Posnr) 和编辑后的值一起存到本地 Map，
		// 保证 onAdjustQty 读取的一定是用户刚输入、已提交(blur/Enter)的最新值
		onNewQuantityChange: function (oEvent) {
			var oInput = oEvent.getSource();
			var sVbeln = oInput.data('vbeln');
			var sPosnr = oInput.data('posnr');
			var sNewValue = oEvent.getParameter('value');

			this._mEditedQty[sVbeln + '|' + sPosnr] = sNewValue;
		},

		onAdjustQty: function () {
			var oExtensionAPI = this.base.getExtensionAPI();
			var oEditFlow = oExtensionAPI.getEditFlow();
			var aSelectedContexts = oExtensionAPI.getSelectedContexts();

			if (!aSelectedContexts || !aSelectedContexts.length) {
				MessageToast.show('Please select at least one row');
				return;
			}

			// 根据选中行组装 deep parameter 的 _AdjustList，
			// 每一行取 Key (Vbeln/Posnr)，编辑后的值优先从本地 Map 取（onNewQuantityChange 记录），
			// 如果用户没有编辑过该行，则回退读取 context 上的 NewQuantity
			var mEditedQty = this._mEditedQty;
			var aAdjustList = aSelectedContexts.map(function (oContext) {
				var sVbeln = oContext.getProperty('Vbeln');
				var sPosnr = oContext.getProperty('Posnr');
				var sKey = sVbeln + '|' + sPosnr;
				var vQty = mEditedQty.hasOwnProperty(sKey) ? mEditedQty[sKey] : oContext.getProperty('NewQuantity');

				return {
					Vbeln: sVbeln,
					Posnr: sPosnr,
					AdjustQty: vQty,
					Meins: oContext.getProperty('Meins')
				};
			});

			oEditFlow.invokeAction('com.sap.gateway.srvd.zsd_ewm_grdata.v0001.AdjustQty', {
				contexts: aSelectedContexts[0],
				parameterValues: [
					{ name: 'Type', value: '' },
					{ name: 'Message', value: '' },
					{ name: '_AdjustList', value: aAdjustList }
				],
				skipParameterDialog: true
			}).then(function () {
				MessageToast.show('Adjust Qty completed');
				oExtensionAPI.refresh();
			}).catch(function (oError) {
				MessageBox.error((oError && oError.message) || 'Adjust Qty failed');
			});
		}

	});
});
