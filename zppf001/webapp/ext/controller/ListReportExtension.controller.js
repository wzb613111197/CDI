sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/ui/core/Messaging"
], function (ControllerExtension, JSONModel, MessageToast, Messaging) {
	'use strict';

	return ControllerExtension.extend('com.cathaydining.zppf001.ext.controller.ListReportExtension', {
		// this section allows to extend lifecycle hooks or hooks provided by Fiori elements
		override: {
			onInit: function () {
				// you can access the Fiori elements extensionAPI via this.base.getExtensionAPI

			},
			onAfterRendering: function () {
				this.oi18n = this.getView().getModel("i18n").getResourceBundle();

				const oPrintModel = new JSONModel({
					'selectedPrinter': 'LP01',
					'numberMode': '01',
					'numberOfLabels': 1,
					actionPath: "",
					numberOfLabelsByPath: {},
					items: []
				});
				this.getView().setModel(oPrintModel, "print");
				const oView = this.getView();
				const that = this;
				const oMDCTable = this.getView().byId("fe::table::PRODUCTIONLABELFORM::LineItem");
				oMDCTable.initialized().then(function () {
					const oUITable = oView.byId("fe::table::PRODUCTIONLABELFORM::LineItem-innerTable");
					oUITable.attachEvent('rowsUpdated', that._onListResultChanged, that);
					//that.setupDragAndDrop(oUITable);
				});

			},
			onPageReady() {
				const oMDCTable = this.getView().byId("com.cathaydining.zppf001::PRODUCTIONLABELFORMList--fe::table::PRODUCTIONLABELFORM::LineItem");
				const oUITable = this.getView().byId("com.cathaydining.zppf001::PRODUCTIONLABELFORMList--fe::table::PRODUCTIONLABELFORM::LineItem-innerTable");
			}

		},
		setupDragAndDrop: function (oTable) {
			if (!oTable) return;

			// 清除已有拖拽配置，避免重复添加
			var aConfigs = oTable.getDragDropConfig();
			aConfigs.forEach(function (oConfig) {
				oTable.removeDragDropConfig(oConfig);
			});

			// 创建拖拽源配置（DragInfo）
			var oDragInfo = new sap.ui.core.dnd.DragInfo({
				sourceAggregation: "rows",          // 指定可拖拽的聚合为表格行
				dragStart: function (oDragStartEvent) {
					var oDragSession = oDragStartEvent.getParameter("dragSession");
					var oTableCtrl = oDragStartEvent.getSource();

					// 获取被拖拽行的索引（优先使用选中行，若未选中则通过鼠标位置获取）
					var iRowIndex = oTableCtrl.getSelectedIndex();
					if (iRowIndex === -1) {
						var oBrowserEvent = oDragStartEvent.getOriginalEvent();
						var aRows = oTableCtrl.getRows();
						for (var i = 0; i < aRows.length; i++) {
							var oRow = aRows[i];
							var $row = oRow.$();
							if ($row && $row.length) {
								var oOffset = $row.offset();
								var iTop = oOffset.top;
								var iBottom = iTop + $row.height();
								if (oBrowserEvent.clientY >= iTop && oBrowserEvent.clientY <= iBottom) {
									iRowIndex = i;
									break;
								}
							}
						}
					}
					// 将行索引存入拖拽会话，供 drop 使用
					oDragSession.setData("sourceIndex", iRowIndex);
					oDragSession.setDropAllowed(true);  // 允许放下
				}
			});

			// 创建投放目标配置（DropInfo）
			var oDropInfo = new sap.ui.core.dnd.DropInfo({
				targetAggregation: "rows",            // 指定可接收拖拽的聚合为表格行
				dropPosition: sap.ui.core.dnd.DropPosition.Between, // 允许插入到行之间
				drop: function (oDropEvent) {
					// 获取拖拽会话和目标控件
					var oDragSession = oDropEvent.getParameter("dragSession");
					var oDropTarget = oDropEvent.getParameter("dropControl"); // 目标行控件

					var iSourceIndex = oDragSession.getData("sourceIndex");
					if (oDropTarget && typeof oDropTarget.getIndex === "function") {
						var iTargetIndex = oDropTarget.getIndex();
						if (iSourceIndex !== undefined && iTargetIndex !== undefined && iSourceIndex !== iTargetIndex) {
							// 交换数据行（需自行实现 swapRows 方法）
							this.swapRows(iSourceIndex, iTargetIndex, oTable);
						}
					}
				}.bind(this)
			});

			// 将拖拽配置添加到表格
			oTable.addDragDropConfig(oDragInfo);
			oTable.addDragDropConfig(oDropInfo);
		},

		/**
		 * 交换表格中两行的数据（基于数据模型）
		 * @param {number} iFrom - 源行索引
		 * @param {number} iTo   - 目标行索引
		 * @param {sap.ui.table.Table} oTable - 表格实例
		 */
		swapRows: function (iFrom, iTo, oTable) {
			var oModel = oTable.getModel();
			var sBindingPath = oTable.getBindingPath("rows"); // 例如 "/EntitySet"
			var aData = oModel.getProperty(sBindingPath);
			if (aData && iFrom >= 0 && iFrom < aData.length && iTo >= 0 && iTo < aData.length && iFrom !== iTo) {
				// 交换数组元素
				var oMoved = aData[iFrom];
				aData.splice(iFrom, 1);
				aData.splice(iTo, 0, oMoved);
				// 更新模型，视图自动刷新
				oModel.setProperty(sBindingPath, aData);
				// 清除表格选中状态（可选）
				oTable.clearSelection();
			}
		},
		formatNumberOfLabels: function (vValue) {
			return this._normalizeNumberOfLabelsValue(vValue);
		},
		onNumberOfLabelsChange: function (oEvent) {
			const oSource = oEvent.getSource();
			const sValue = this._normalizeNumberOfLabelsValue(oEvent.getParameter("value"));
			const oContext = oSource.getBindingContext();
			const oPrintModel = this.getView().getModel("print");
			const mNumberOfLabelsByPath = Object.assign({}, oPrintModel.getProperty("/numberOfLabelsByPath") || {});

			oSource.setValue(sValue);
			if (!oContext) {
				return;
			}

			mNumberOfLabelsByPath[oContext.getPath()] = sValue;
			oPrintModel.setProperty("/numberOfLabelsByPath", mNumberOfLabelsByPath);
		},
		onPrintPress(oContext, aSelectedContexts) {
			let aSelectedItems = [];
			const oPrintModel = this.getView().getModel("print");
			const mNumberOfLabelsByPath = this._collectNumberOfLabelsByPathFromTable();
			this._aPrintSelectedContexts = Array.isArray(aSelectedContexts) ? aSelectedContexts.slice() : [];
			for (let i = 0; i < aSelectedContexts.length; i++) {
				const sContextPath = aSelectedContexts[i].getPath();
				const oSelectedObject = aSelectedContexts[i].getObject();
				aSelectedItems.push({
					contextPath: sContextPath,
					ProductionOrder: oSelectedObject.ProductionOrder,
					Material: oSelectedObject.Material,
					SplitBatchNumber: oSelectedObject.SplitBatchNumber,
					ItemNo: oSelectedObject.ItemNo,
					numberOfLabels: this._getNumberOfLabelsForContext(sContextPath, oSelectedObject.NumberofLabels, mNumberOfLabelsByPath)
				});
			}
			oPrintModel.setProperty("/items", aSelectedItems);
			oPrintModel.setProperty("/actionPath", aSelectedContexts[0]?.getPath() || "");
			this.oDialog = null;
			this.oDialog = sap.ui.xmlfragment('com.cathaydining.zppf001.ext.fragment.PrintDialog', this);
			this.getView().addDependent(this.oDialog);
			this.oDialog.open();
			this.oDialog.attachAfterClose(function () {
				//destroy to clear all user input for a further call of the fragment and to avoid having duplicate ids
				this.destroy();
			});
		},
		onPrint: function () {
			const oDataModel = this.getView().getModel();
			const oPrintModel = this.getView().getModel("print");
			const sPrinter = oPrintModel.getProperty("/selectedPrinter");
			const sMode = this.getView().getModel("print").getProperty("/numberMode");
			const sNumberOfLabels = this.getView().getModel("print").getProperty("/numberOfLabels");
			const aPrintItem = oPrintModel.getProperty("/items");
			const aSelectedContexts = this._aPrintSelectedContexts || [];
			const bByItemMode = sMode === "01";
			const sOperation = 'com.sap.gateway.srvd.zsd_pp_production_label_form.v0001.print(...)';

			if (bByItemMode) {
				const bHasInvalidNumber = aPrintItem.some(function (oItem) {
					const iNumberOfLabels = Number(oItem.numberOfLabels);
					return !Number.isFinite(iNumberOfLabels) || iNumberOfLabels <= 0;
				});

				if (bHasInvalidNumber) {
					MessageToast.show(this.oi18n.getText("printNumberMustBePositive"));
					return;
				}
			}

			if (!bByItemMode) {
				const iMassPrintPage = Number(sNumberOfLabels);

				if (!Number.isFinite(iMassPrintPage) || iMassPrintPage <= 0) {
					MessageToast.show(this.oi18n.getText("printNumberMustBePositive"));
					return;
				}
			}

			this.oDialog.setBusy(true);

			const aInvocations = aPrintItem.map(function (oItem, iIndex) {
				const iPrintPage = Number(bByItemMode ? oItem.numberOfLabels : sNumberOfLabels);
				const oItemContext = aSelectedContexts[iIndex];
				const oContextBinding = oDataModel.bindContext(sOperation, oItemContext, { $$updateGroupId: 'myUpdatedGroup' });

				oContextBinding.setParameter('Printer', sPrinter);
				oContextBinding.setParameter('PrintPage', iPrintPage);

				return oContextBinding.invoke("myUpdatedGroup");
			});

			const fnSuccess = () => {
				this.openMessageView();
				oDataModel.refresh();
				this.oDialog.setBusy(false);
				this.oDialog.close();
				this._aPrintSelectedContexts = null;
			}

			const fnError = (error) => {
				this.oDialog.setBusy(false);
				this.openMessageView();
				this._aPrintSelectedContexts = null;
			}

			oDataModel.submitBatch("myUpdatedGroup").then(fnSuccess, fnError);
			// Promise.all(aInvocations)
			// 	.then(function () {
			// 		return oDataModel.submitBatch("myUpdatedGroup");
			// 	})
			// 	.then(fnSuccess, fnError);
		},
		async openMessageView() {
			const aMessages = Messaging.getMessageModel().getProperty("/");
			if (aMessages.length > 0) {
				const oMessageModel = new JSONModel(aMessages);
				this.getView().setModel(oMessageModel, "message");
			} else {
				MessageToast.show("Process Done");
			}

			const oDialog = sap.ui.xmlfragment("com.cathaydining.zppf001.ext.fragment.Message", this);
			this.getView().addDependent(oDialog);
			oDialog.open();
			oDialog.attachAfterClose(function () {
				Messaging.removeAllMessages();
				this.destroy();
			});
		},
		onCloseDialog: function (oEvent) {
			this._aPrintSelectedContexts = null;
			oEvent.getSource().getParent().close();
		},
		_onListResultChanged() {
			const oPrintModel = this.getView().getModel("print");
			if (oPrintModel) {
				oPrintModel.setProperty("/numberOfLabelsByPath", {});
			}

			setTimeout(() => {
				this._resetNumberInputsFromContext();
			}, 0);
		},
		_resetNumberInputsFromContext() {
			const oUITable = this.getView().byId("fe::table::PRODUCTIONLABELFORM::LineItem-innerTable")
				|| this.getView().byId("com.cathaydining.zppf001::PRODUCTIONLABELFORMList--fe::table::PRODUCTIONLABELFORM::LineItem-innerTable");

			if (!oUITable || typeof oUITable.getRows !== "function") {
				return;
			}

			oUITable.getRows().forEach((oRow) => {
				const oContext = oRow.getBindingContext();
				if (!oContext) {
					return;
				}

				const oInputCell = oRow.getCells().find((oCell) => {
					if (!oCell || typeof oCell.getValue !== "function") {
						return false;
					}

					const sId = oCell.getId ? oCell.getId() : "";
					return sId.includes("numberOfLabelsInput");
				});

				if (!oInputCell) {
					return;
				}

				const sDefaultValue = this._normalizeNumberOfLabelsValue(
					oContext.getProperty("NumberofLabels") || oContext.getProperty("NUMBEROFLABELS")
				);
				oInputCell.setValue(sDefaultValue);
			});
		},
		_getNumberOfLabelsForContext(sContextPath, vDefaultValue, mValueByPath) {
			const mNumberOfLabelsByPath = mValueByPath || this.getView().getModel("print").getProperty("/numberOfLabelsByPath") || {};
			if (Object.prototype.hasOwnProperty.call(mNumberOfLabelsByPath, sContextPath)) {
				return mNumberOfLabelsByPath[sContextPath];
			}

			return this._normalizeNumberOfLabelsValue(vDefaultValue);
		},
		_collectNumberOfLabelsByPathFromTable() {
			const mValueByPath = {};
			const oView = this.getView();
			const oUITable = oView.byId("fe::table::PRODUCTIONLABELFORM::LineItem-innerTable")
				|| oView.byId("com.cathaydining.zppf001::PRODUCTIONLABELFORMList--fe::table::PRODUCTIONLABELFORM::LineItem-innerTable");

			if (!oUITable || typeof oUITable.getRows !== "function") {
				return mValueByPath;
			}

			oUITable.getRows().forEach((oRow) => {
				const oContext = oRow.getBindingContext();
				if (!oContext) {
					return;
				}

				const oInputCell = oRow.getCells().find((oCell) => {
					if (!oCell || typeof oCell.getValue !== "function") {
						return false;
					}

					const sId = oCell.getId ? oCell.getId() : "";
					return sId.includes("numberOfLabelsInput");
				});

				if (!oInputCell) {
					return;
				}

				mValueByPath[oContext.getPath()] = this._normalizeNumberOfLabelsValue(oInputCell.getValue());
			});

			this.getView().getModel("print").setProperty("/numberOfLabelsByPath", mValueByPath);
			return mValueByPath;
		},
		_normalizeNumberOfLabelsValue(vValue) {
			const sValue = String(vValue ?? "").trim();
			return sValue.replace(/[^0-9]/g, "");
		},
		_clearMessage() {
			Messaging.removeAllMessages();
		}
	});
});
