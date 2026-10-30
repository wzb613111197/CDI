sap.ui.define([
	'sap/ui/core/mvc/ControllerExtension',
	'sap/ui/core/format/DateFormat',
	'sap/ui/core/dnd/DragInfo',
	'sap/ui/core/dnd/DropInfo',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'sap/m/TableSelectDialog',
	'sap/m/Column',
	'sap/m/ColumnListItem',
	'sap/m/Text',
	'sap/ui/model/json/JSONModel',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'
], function (ControllerExtension, DateFormat, DragInfo, DropInfo, MessageBox, MessageToast,
	TableSelectDialog, Column, ColumnListItem, Text, JSONModel, Filter, FilterOperator) {
	'use strict';

	/**
	 * ConType → value help on main service (see metadata.xml EntitySets).
	 * DEST: AirportCode / AirportName
	 * SERV: ServType / ServTypeDesc
	 * FLT:  FlightNum (+ AirlineCode filter)
	 * HAUL: HualType
	 */
	var CON_VALUE_HELP = {
		DEST: {
			entitySet: 'ZI_PP_CON_DEST_VH',
			keyField: 'AirportCode',
			textField: 'AirportName',
			title: 'Destination'
		},
		SERV: {
			entitySet: 'ZI_PP_CON_SERV_VH',
			keyField: 'ServType',
			textField: 'ServTypeDesc',
			title: 'Service Type'
		},
		FLT: {
			entitySet: 'ZI_PP_CON_FLT_VH',
			keyField: 'FlightNum',
			title: 'Flight',
			hideTextColumn: true,
			filterByAirline: true,
			airlineField: 'AirlineCode'
		},
		HAUL: {
			entitySet: 'ZI_PP_CON_HUAL_VH',
			keyField: 'HualType',
			textField: 'HualType',
			title: 'Haul'
		}
	};

	var ALL_VALUE_TRUE = 'X';

	return ControllerExtension.extend('com.cathaydining.zppe024.ext.controller.ObjectPageExtension', {

		override: {
			routing: {
				onAfterBinding: function (oBindingContext) {
					if (!oBindingContext) {
						return;
					}
					var oTemplateTable = this._getTemplateMdcTable();
					if (oTemplateTable) {
						this._applyColumnVisibility(oBindingContext, oTemplateTable);
						this._enableTemplateDragDrop(oTemplateTable);
					}
					var oConTable = this._getConMdcTable();
					if (oConTable) {
						this._enableConDragDrop(oConTable);
						this._applyConSectorVariantVisibility(oBindingContext, oConTable);
					}
				}
			},

			editFlow: {
				onBeforeCreate: function (mParameters) {
					if (mParameters && mParameters.contextPath === "_Con") {
						var sSector = this._getActiveSector();
						if (sSector) {
							mParameters.createParameters = mParameters.createParameters || [];
							mParameters.createParameters.push({ Sector: sSector });
						}
					}
					return Promise.resolve();
				}
			}
		},

		/**
		 * Assignments (_Template) MDC table used on the Object Page.
		 * @returns {sap.ui.mdc.Table|null}
		 * @private
		 */
		_getTemplateMdcTable: function () {
			var oView = this.base.getView();
			var aLocalIds = [
				"fe::table::_Template::LineItem",
				"fe::table::_Template::com.sap.vocabularies.UI.v1.LineItem",
				"fe::table::_Template::SelectionPresentationVariant::table"
			];
			var Element = sap.ui.require("sap/ui/core/Element");
			var sViewId = oView.getId();
			var i;
			for (i = 0; i < aLocalIds.length; i++) {
				var oById = oView.byId(aLocalIds[i])
					|| (Element && Element.getElementById(sViewId + "--" + aLocalIds[i]));
				if (oById && oById.isA && oById.isA("sap.ui.mdc.Table")) {
					return oById;
				}
			}
			var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
				return oCtrl.isA && oCtrl.isA("sap.ui.mdc.Table");
			});
			for (i = 0; i < aTables.length; i++) {
				var sId = aTables[i].getId();
				if (sId.indexOf("fe::table::_Template::") !== -1) {
					return aTables[i];
				}
				var oBinding = aTables[i].getRowBinding && aTables[i].getRowBinding();
				if (!oBinding) {
					var oInner = this._getResponsiveTable(aTables[i]);
					oBinding = oInner && (oInner.getBinding("items") || oInner.getBinding("rows"));
				}
				if (oBinding && oBinding.getPath && oBinding.getPath() === "_Template") {
					return aTables[i];
				}
			}
			return null;
		},

		/**
		 * Inner sap.m.Table of an MDC table.
		 * @param {sap.ui.mdc.Table} oMdcTable
		 * @returns {sap.m.Table|null}
		 * @private
		 */
		_getResponsiveTable: function (oMdcTable) {
			if (!oMdcTable) {
				return null;
			}
			var oInner = oMdcTable.getAggregation("_content");
			if (oInner && oInner.isA && oInner.isA("sap.m.Table")) {
				return oInner;
			}
			var Element = sap.ui.require("sap/ui/core/Element");
			var oByInnerId = Element && Element.getElementById(oMdcTable.getId() + "-innerTable");
			if (oByInnerId && oByInnerId.isA && oByInnerId.isA("sap.m.Table")) {
				return oByInnerId;
			}
			var aTables = oMdcTable.findAggregatedObjects(true, function (oCtrl) {
				return oCtrl.isA && oCtrl.isA("sap.m.Table");
			});
			return aTables.length ? aTables[0] : null;
		},

		/**
		 * Standard UI5 DnD (DragInfo / DropInfo) on Assignments ResponsiveTable.
		 * Do NOT destroy configs after drop — that breaks subsequent drags.
		 * @param {sap.ui.mdc.Table} oMdcTable
		 * @private
		 */
		_enableTemplateDragDrop: function (oMdcTable) {
			if (!oMdcTable) {
				return;
			}
			var that = this;
			var fnEnsure = function () {
				that._ensureTemplateDndConfigs(that._getResponsiveTable(oMdcTable));
			};
			if (!oMdcTable.data("templateDndHooked")) {
				oMdcTable.data("templateDndHooked", true);
				oMdcTable.attachEvent("tableUpdated", fnEnsure);
				oMdcTable.addEventDelegate({
					onAfterRendering: fnEnsure
				});
			}
			fnEnsure();
		},

		/**
		 * Add DragInfo/DropInfo once per inner table instance.
		 * @param {sap.m.Table} oInnerTable
		 * @private
		 */
		_ensureTemplateDndConfigs: function (oInnerTable) {
			if (!oInnerTable || !oInnerTable.isA("sap.m.Table")) {
				return;
			}
			var aConfigs = oInnerTable.getDragDropConfig() || [];
			var bHas = aConfigs.some(function (oConfig) {
				return oConfig.getGroupName && oConfig.getGroupName() === "TemplateSequence";
			});
			if (bHas) {
				return;
			}

			// Keep stable handler refs so DropInfo is not rebound with a new closure each time
			if (!this._fnTemplateDrop) {
				this._fnTemplateDrop = this._onTemplateRowDrop.bind(this);
			}

			oInnerTable.addDragDropConfig(new DragInfo({
				sourceAggregation: "items",
				groupName: "TemplateSequence"
			}));
			oInnerTable.addDragDropConfig(new DropInfo({
				targetAggregation: "items",
				dropPosition: "Between",
				dropLayout: "Vertical",
				groupName: "TemplateSequence",
				drop: this._fnTemplateDrop
			}));
		},

		/**
		 * Standard DropInfo handler — reorder and update Sequence (NUMC 3).
		 * @param {sap.ui.base.Event} oEvent
		 * @private
		 */
		_onTemplateRowDrop: function (oEvent) {
			if (this._bTemplateReorderBusy) {
				return;
			}

			var oUiModel = this.base.getView().getModel("ui");
			if (oUiModel && oUiModel.getProperty("/isEditable") === false) {
				return;
			}

			var oDraggedItem = oEvent.getParameter("draggedControl");
			var oDroppedItem = oEvent.getParameter("droppedControl");
			var sDropPosition = oEvent.getParameter("dropPosition");
			if (!oDraggedItem || !oDroppedItem || oDraggedItem === oDroppedItem) {
				return;
			}

			var oTable = oDraggedItem.getParent();
			if (!oTable || !oTable.isA("sap.m.Table")) {
				return;
			}

			var aItems = oTable.getItems().filter(function (oItem) {
				return oItem.isA("sap.m.ColumnListItem") && !!oItem.getBindingContext();
			});
			var iFrom = aItems.indexOf(oDraggedItem);
			var iTo = aItems.indexOf(oDroppedItem);
			if (iFrom < 0 || iTo < 0) {
				return;
			}

			aItems.splice(iFrom, 1);
			if (iFrom < iTo) {
				iTo -= 1;
			}
			if (sDropPosition === "After") {
				iTo += 1;
			}
			aItems.splice(iTo, 0, oDraggedItem);

			var fnToNumc3 = function (iValue) {
				return ("000" + String(iValue)).slice(-3);
			};

			this._bTemplateReorderBusy = true;
			var that = this;

			// Capture contexts before any rebind
			var aContexts = aItems.map(function (oItem) {
				return oItem.getBindingContext();
			});

			Promise.all(aContexts.map(function (oCtx, iIndex) {
				var sNewSeq = fnToNumc3(iIndex + 1);
				var sOldSeq = fnToNumc3(parseInt(oCtx.getProperty("Sequence"), 10) || 0);
				if (sOldSeq === sNewSeq) {
					return Promise.resolve();
				}
				return oCtx.setProperty("Sequence", sNewSeq);
			})).then(function () {
				// Trigger Side Effects + reload _Template so UI re-sorts by Sequence
				return that._requestTemplateRefresh();
			}).catch(function (oError) {
				var sMsg = (oError && (oError.message || (oError.error && oError.error.message)))
					|| "Failed to update Sequence. Ensure Sequence is updatable in BDEF.";
				MessageBox.error(sMsg);
			}).finally(function () {
				that._bTemplateReorderBusy = false;
				// After collection refresh FE may recreate inner table — re-add DnD if missing
				setTimeout(function () {
					var oMdc = that._getTemplateMdcTable();
					if (oMdc) {
						that._ensureTemplateDndConfigs(that._getResponsiveTable(oMdc));
					}
				}, 500);
			});
		},

		/**
		 * Refresh Assignments (_Template) via OData V4 Side Effects (same pattern as _Con).
		 * @returns {Promise}
		 * @private
		 */
		_requestTemplateRefresh: function () {
			var oRootContext = this.base.getView().getBindingContext();
			if (!oRootContext || !oRootContext.requestSideEffects) {
				return Promise.resolve();
			}
			return Promise.resolve(
				oRootContext.requestSideEffects([{ $NavigationPropertyPath: "_Template" }])
			);
		},

		/**
		 * Loading Condition (_Con) MDC table.
		 * @returns {sap.ui.mdc.Table|null}
		 * @private
		 */
		_getConMdcTable: function () {
			var oView = this.base.getView();
			var oById = oView.byId("com.cathaydining.zppe024::ZC_PP_LDGDEF_HDRObjectPage--fe::table::_Con::LineItem")
				|| oView.byId("com.cathaydining.zppe024::ZC_PP_LDGDEF_HDRObjectPage--fe::table::_Con::SelectionPresentationVariant::table");
			if (oById) {
				return oById;
			}
			var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
				return oCtrl.isA("sap.ui.mdc.Table");
			});
			for (var i = 0; i < aTables.length; i++) {
				var oInner = aTables[i].getAggregation("_content");
				var oBinding = oInner && (oInner.getBinding("items") || oInner.getBinding("rows"));
				if (oBinding && oBinding.getPath && oBinding.getPath() === "_Con") {
					return aTables[i];
				}
			}
			return null;
		},

		/**
		 * When LoadingDefinitionType is S, hide Next Sector / 2nd Next Sector quick variants.
		 * @param {sap.ui.model.Context} oHeaderContext
		 * @param {sap.ui.mdc.Table} oMdcTable
		 * @private
		 */
		_applyConSectorVariantVisibility: function (oHeaderContext, oMdcTable) {
			if (!oHeaderContext || !oMdcTable) {
				return;
			}
			var that = this;
			oHeaderContext.requestProperty("LoadingDefinitionType").then(function (sType) {
				that._sConLoadingDefinitionType = sType;
				that._setConNextSectorVariantsVisible(oMdcTable, sType !== "S");
			});
			if (!oMdcTable.data("conSectorVariantHooked")) {
				oMdcTable.data("conSectorVariantHooked", true);
				var fnReapply = function () {
					that._setConNextSectorVariantsVisible(
						oMdcTable,
						that._sConLoadingDefinitionType !== "S"
					);
				};
				oMdcTable.attachEvent("tableUpdated", fnReapply);
				oMdcTable.addEventDelegate({
					onAfterRendering: fnReapply
				});
			}
		},

		/**
		 * Show/hide Sector2 & Sector3 items on the Con table quickVariantSelection control.
		 * @param {sap.ui.mdc.Table} oMdcTable
		 * @param {boolean} bVisible
		 * @private
		 */
		_setConNextSectorVariantsVisible: function (oMdcTable, bVisible) {
			if (!oMdcTable) {
				return;
			}
			var aSegmented = oMdcTable.findAggregatedObjects(true, function (oCtrl) {
				return oCtrl.isA("sap.m.SegmentedButton");
			});
			if (!aSegmented.length && oMdcTable.getParent()) {
				aSegmented = oMdcTable.getParent().findAggregatedObjects(true, function (oCtrl) {
					return oCtrl.isA("sap.m.SegmentedButton");
				});
			}

			aSegmented.forEach(function (oSeg) {
				var aItems = oSeg.getItems() || [];
				var bHasSectorKeys = aItems.some(function (oItem) {
					var sKey = (oItem.getKey && oItem.getKey()) || "";
					return sKey.indexOf("Sector2") !== -1 || sKey.indexOf("Sector3") !== -1;
				});

				aItems.forEach(function (oItem, iIndex) {
					var sKey = (oItem.getKey && oItem.getKey()) || "";
					var bIsNextSector = bHasSectorKeys
						? (sKey.indexOf("Sector2") !== -1 || sKey.indexOf("Sector3") !== -1)
						: (iIndex > 0); // fallback: keep first (Current Sector), hide others
					if (bIsNextSector && oItem.setVisible) {
						oItem.setVisible(!!bVisible);
					}
				});

				if (!bVisible && oSeg.getSelectedKey) {
					var sSelected = oSeg.getSelectedKey() || "";
					if (sSelected.indexOf("Sector2") !== -1 || sSelected.indexOf("Sector3") !== -1
						|| (!bHasSectorKeys && aItems.indexOf(oSeg.getSelectedItem && oSeg.getSelectedItem()) > 0)) {
						var oCurrent = aItems[0];
						if (oCurrent && oCurrent.getKey) {
							oSeg.setSelectedKey(oCurrent.getKey());
							if (oSeg.fireSelectionChange) {
								oSeg.fireSelectionChange({ item: oCurrent });
							}
						}
					}
				}
			});
		},

		/**
		 * Standard UI5 DnD on Loading Condition table (ConNum NUMC 3).
		 * @param {sap.ui.mdc.Table} oMdcTable
		 * @private
		 */
		_enableConDragDrop: function (oMdcTable) {
			if (!oMdcTable) {
				return;
			}
			var that = this;
			var fnEnsure = function () {
				that._ensureConDndConfigs(oMdcTable.getAggregation("_content"));
			};
			if (!oMdcTable.data("conDndHooked")) {
				oMdcTable.data("conDndHooked", true);
				oMdcTable.attachEvent("tableUpdated", fnEnsure);
				oMdcTable.addEventDelegate({
					onAfterRendering: fnEnsure
				});
			}
			fnEnsure();
		},

		/**
		 * @param {sap.m.Table} oInnerTable
		 * @private
		 */
		_ensureConDndConfigs: function (oInnerTable) {
			if (!oInnerTable || !oInnerTable.isA("sap.m.Table")) {
				return;
			}
			var aConfigs = oInnerTable.getDragDropConfig() || [];
			var bHas = aConfigs.some(function (oConfig) {
				return oConfig.getGroupName && oConfig.getGroupName() === "ConNumSequence";
			});
			if (bHas) {
				return;
			}
			if (!this._fnConDrop) {
				this._fnConDrop = this._onConRowDrop.bind(this);
			}
			oInnerTable.addDragDropConfig(new DragInfo({
				sourceAggregation: "items",
				groupName: "ConNumSequence"
			}));
			oInnerTable.addDragDropConfig(new DropInfo({
				targetAggregation: "items",
				dropPosition: "Between",
				dropLayout: "Vertical",
				groupName: "ConNumSequence",
				drop: this._fnConDrop
			}));
		},

		/**
		 * Reorder Con rows and update ConNum (NUMC 3); refresh via Side Effects.
		 * @param {sap.ui.base.Event} oEvent
		 * @private
		 */
		_onConRowDrop: function (oEvent) {
			if (this._bConReorderBusy) {
				return;
			}
			var oUiModel = this.base.getView().getModel("ui");
			if (oUiModel && oUiModel.getProperty("/isEditable") === false) {
				return;
			}

			var oDraggedItem = oEvent.getParameter("draggedControl");
			var oDroppedItem = oEvent.getParameter("droppedControl");
			var sDropPosition = oEvent.getParameter("dropPosition");
			if (!oDraggedItem || !oDroppedItem || oDraggedItem === oDroppedItem) {
				return;
			}

			var oTable = oDraggedItem.getParent();
			if (!oTable || !oTable.isA("sap.m.Table")) {
				return;
			}

			var aItems = oTable.getItems().filter(function (oItem) {
				return oItem.isA("sap.m.ColumnListItem") && !!oItem.getBindingContext();
			});
			var iFrom = aItems.indexOf(oDraggedItem);
			var iTo = aItems.indexOf(oDroppedItem);
			if (iFrom < 0 || iTo < 0) {
				return;
			}

			aItems.splice(iFrom, 1);
			if (iFrom < iTo) {
				iTo -= 1;
			}
			if (sDropPosition === "After") {
				iTo += 1;
			}
			aItems.splice(iTo, 0, oDraggedItem);

			var fnToNumc3 = function (iValue) {
				return ("000" + String(iValue)).slice(-3);
			};

			this._bConReorderBusy = true;
			var that = this;
			var aContexts = aItems.map(function (oItem) {
				return oItem.getBindingContext();
			});

			Promise.all(aContexts.map(function (oCtx, iIndex) {
				var sNew = fnToNumc3(iIndex + 1);
				var sOld = fnToNumc3(parseInt(oCtx.getProperty("ConNum"), 10) || 0);
				if (sOld === sNew) {
					return Promise.resolve();
				}
				return oCtx.setProperty("ConNum", sNew);
			})).then(function () {
				return that._requestPageRefresh();
			}).catch(function (oError) {
				var sMsg = (oError && (oError.message || (oError.error && oError.error.message)))
					|| "Failed to update ConNum. Ensure ConNum is updatable in BDEF.";
				MessageBox.error(sMsg);
			}).finally(function () {
				that._bConReorderBusy = false;
				setTimeout(function () {
					var oMdc = that._getConMdcTable();
					if (oMdc) {
						that._ensureConDndConfigs(oMdc.getAggregation("_content"));
					}
				}, 500);
			});
		},

		_applyColumnVisibility: function (oHeaderContext, oMdcTable) {
			oHeaderContext.requestProperty("LoadingDefinitionType").then(function (sType) {
				var mVisibleByType = {
					A: ["CustomSequenceColumn", "LdgTempCode", "LoadingTemplateName"],
					S: ["CustomSequenceColumn", "Sector", "ServSeq", "SubsequentService", "LdgTempCode", "CabinClass", "SpecialMealType", "MealType", "CustomerLoadingTemplateCode", "LoadingTemplateName"],
					P: ["CustomSequenceColumn", "Sector", "ServSeq", "LdgTempCode", "CabinClass", "MealType", "CustomerLoadingTemplateCode", "LoadingTemplateName"]
				};
				// Frontend mandatory * by LoadingDefinitionType (annotation FieldControl ineffective on table headers)
				var mRequiredByType = {
					A: ["LoadingTemplateCode"],
					S: ["LoadingTemplateCode", "CabinClass", "SpecialMealType"],
					P: ["LoadingTemplateCode", "Sector", "ServSeq", "CabinClass"]
				};
				var aVisible = mVisibleByType[sType];
				var aRequired = mRequiredByType[sType] || [];

				var oInnerTable = oMdcTable.getAggregation("_content");
				if (!oInnerTable) {
					return;
				}

				var aMdcColumns = oMdcTable.getColumns() || [];
				var aInnerColumns = oInnerTable.getColumns() || [];
				// ResponsiveTable often has a leading selection column → index offset vs MDC columns
				var iOffset = Math.max(0, aInnerColumns.length - aMdcColumns.length);

				aInnerColumns.forEach(function (oInnerCol, iIndex) {
					var iMdcIndex = iIndex - iOffset;
					if (iMdcIndex < 0) {
						return; // selection / mode column
					}
					var oMdcCol = aMdcColumns[iMdcIndex];
					var sFieldName = oMdcCol && this._getColumnFieldName(oMdcCol);
					if (!sFieldName) {
						return;
					}

					// Custom Sequence column must stay visible (read-only extension)
					if (this._isSequenceColumn(sFieldName, oMdcCol)) {
						oInnerCol.setVisible(true);
						this._setColumnRequired(oInnerCol, oMdcCol, false);
						return;
					}

					if (!aVisible) {
						oInnerCol.setVisible(true);
					} else {
						oInnerCol.setVisible(aVisible.indexOf(sFieldName) !== -1);
					}

					var bRequired = aRequired.indexOf(sFieldName) !== -1
						|| aRequired.indexOf(this._normalizeTemplateFieldName(sFieldName)) !== -1;
					this._setColumnRequired(oInnerCol, oMdcCol, bRequired);
				}.bind(this));
			}.bind(this));
		},

		/**
		 * Map MDC property keys / IBAN column keys to logical field names used in required lists.
		 * @param {string} sFieldName
		 * @returns {string}
		 * @private
		 */
		_normalizeTemplateFieldName: function (sFieldName) {
			if (!sFieldName) {
				return sFieldName;
			}
			if (sFieldName.indexOf("LoadingTemplateCode") !== -1 || sFieldName === "LdgTempCode") {
				return "LoadingTemplateCode";
			}
			return sFieldName;
		},

		/**
		 * Show / hide mandatory asterisk on table column header (frontend control).
		 * @param {sap.m.Column} oInnerCol
		 * @param {sap.ui.mdc.table.Column} oMdcCol
		 * @param {boolean} bRequired
		 * @private
		 */
		_setColumnRequired: function (oInnerCol, oMdcCol, bRequired) {
			if (oMdcCol && typeof oMdcCol.setRequired === "function") {
				oMdcCol.setRequired(!!bRequired);
			}
			var oHeader = oInnerCol && oInnerCol.getHeader && oInnerCol.getHeader();
			if (oHeader && typeof oHeader.setRequired === "function") {
				oHeader.setRequired(!!bRequired);
			}
		},

		/**
		 * ConType / ConOpt custom column: editable only when page is editable and row has no _Val.
		 * @param {sap.ui.base.Event} oEvent
		 */
		onConTypeOptContextChange: function (oEvent) {
			var oBox = oEvent.getSource();
			var oCtx = oBox.getBindingContext();
			if (!oCtx) {
				return;
			}
			var oField = oBox.getItems && oBox.getItems()[0];
			if (!oField) {
				return;
			}
			var oUiModel = oBox.getModel("ui");
			var bPageEditable = !(oUiModel && oUiModel.getProperty("/isEditable") === false);
			var that = this;
			var oListBinding = oCtx.getModel().bindList("_Val", oCtx);
			oListBinding.requestContexts(0, 1).then(function (aContexts) {
				var bHasVal = !!(aContexts && aContexts.length);
				that._setFeFieldReadOnly(oField, !bPageEditable || bHasVal);
			}).catch(function () {
				that._setFeFieldReadOnly(oField, !bPageEditable);
			});
		},

		/**
		 * @param {sap.ui.core.Control} oField macros:Field or inner input
		 * @param {boolean} bReadOnly
		 * @private
		 */
		_setFeFieldReadOnly: function (oField, bReadOnly) {
			if (!oField) {
				return;
			}
			if (typeof oField.setReadOnly === "function") {
				oField.setReadOnly(!!bReadOnly);
				return;
			}
			if (typeof oField.setEditMode === "function") {
				oField.setEditMode(bReadOnly ? "Display" : "Editable");
				return;
			}
			if (typeof oField.setEditable === "function") {
				oField.setEditable(!bReadOnly);
				return;
			}
			var aInner = oField.findAggregatedObjects
				? oField.findAggregatedObjects(true, function (oCtrl) {
					return oCtrl.isA
						&& (oCtrl.isA("sap.m.Input")
							|| oCtrl.isA("sap.m.ComboBox")
							|| oCtrl.isA("sap.m.Select")
							|| oCtrl.isA("sap.ui.mdc.Field"));
				})
				: [];
			(aInner || []).forEach(function (oInner) {
				if (typeof oInner.setEditable === "function") {
					oInner.setEditable(!bReadOnly);
				} else if (typeof oInner.setEditMode === "function") {
					oInner.setEditMode(bReadOnly ? "Display" : "Editable");
				}
			});
		},

		_getColumnFieldName: function (oMdcColumn) {
			var sKey = oMdcColumn.getPropertyKey && oMdcColumn.getPropertyKey();

			if (sKey) {
				var aParts = sKey.split("/");
				return aParts[aParts.length - 1];
			}

			return undefined;
		},

		/**
		 * @param {string} sFieldName
		 * @param {sap.ui.mdc.TableColumn} oMdcColumn
		 * @returns {boolean}
		 * @private
		 */
		_isSequenceColumn: function (sFieldName, oMdcColumn) {
			if (sFieldName === "Sequence" || sFieldName === "CustomSequenceColumn") {
				return true;
			}
			var sKey = oMdcColumn && oMdcColumn.getPropertyKey && oMdcColumn.getPropertyKey();
			return !!(sKey && sKey.indexOf("CustomSequenceColumn") !== -1);
		},

		/**
		 * @param {string} sFieldName
		 * @param {sap.ui.mdc.TableColumn} oMdcColumn
		 * @returns {boolean}
		 * @private
		 */
		_isConNumColumn: function (sFieldName, oMdcColumn) {
			if (sFieldName === "ConNum" || sFieldName === "CustomConNumColumn") {
				return true;
			}
			var sKey = oMdcColumn && oMdcColumn.getPropertyKey && oMdcColumn.getPropertyKey();
			return !!(sKey && sKey.indexOf("CustomConNumColumn") !== -1);
		},

		onMultiInputChange: function (oEvent) {
			var oSource = oEvent.getSource();
			var oView = this.base.getView();
			var that = this;
			var sValue = oSource.getValue();
			if (!sValue) {
				return;
			}
			var oContext = oSource.getBindingContext();
			if (!oContext) {
				return;
			}
			this._currentMultiInput = oSource;
			oView.setBusy(true);
			this._createValEntry(oContext, sValue).finally(function () {
				that._requestPageRefresh().finally(function () {
					oView.setBusy(false);
				});
			});
			oSource.setValue('');
		},

		onValueHelp: function (oEvent) {
			var oSource = oEvent.getSource();
			var oContext = oSource.getBindingContext();
			if (!oContext) {
				return;
			}

			this._currentMultiInput = oSource;
			var sConType = oContext.getProperty('ConType');
			var sConOpt = oContext.getProperty('ConOpt');

			// ALL uses checkbox only — no value help
			if (sConType === 'ALL') {
				return;
			}

			// Read existing values from token binding
			var aExistingValues = [];
			var oTokenBinding = oSource.getBinding('tokens');
			if (oTokenBinding) {
				var aContexts = oTokenBinding.getContexts();
				aContexts.forEach(function (oCtx) {
					aExistingValues.push(oCtx.getProperty('Value'));
				});
			}

			if (sConOpt === 'BT' || sConOpt === 'NB') {
				this._openRangeDialog(oContext, sConType, aExistingValues, sConOpt);
				return;
			}

			var oVHConfig = CON_VALUE_HELP[sConType];
			if (oVHConfig) {
				this._openEntityValueHelp(oContext, oVHConfig, aExistingValues);
			} else {
				// EQ / NE free text (e.g. STD time)
				this._openTableDialog(oContext, sConType, aExistingValues);
			}
		},

		/**
		 * Sync ALL checkbox from existing _Val entries (Value = 'X').
		 * @param {sap.ui.base.Event} oEvent
		 */
		onAllCheckboxContextChange: function (oEvent) {
			var oCheckBox = oEvent.getSource();
			var oContext = oCheckBox.getBindingContext();
			if (!oContext || oContext.getProperty('ConType') !== 'ALL') {
				return;
			}
			var oModel = oContext.getModel();
			var oListBinding = oModel.bindList('_Val', oContext);
			oListBinding.requestContexts(0, 20).then(function (aContexts) {
				var bSelected = (aContexts || []).some(function (oCtx) {
					var sVal = oCtx.getProperty('Value');
					return sVal === ALL_VALUE_TRUE || sVal === 'true' || sVal === '1';
				});
				oCheckBox.setSelected(bSelected);
			}).catch(function () {
				oCheckBox.setSelected(false);
			});
		},

		/**
		 * ALL condition: persist boolean as a single _Val entry with Value = 'X'.
		 * @param {sap.ui.base.Event} oEvent
		 */
		onAllValueSelect: function (oEvent) {
			var oCheckBox = oEvent.getSource();
			var oContext = oCheckBox.getBindingContext();
			if (!oContext || oContext.getProperty('ConType') !== 'ALL') {
				return;
			}
			var bSelected = oEvent.getParameter('selected');
			var oView = this.base.getView();
			var that = this;
			var oUiModel = oView.getModel('ui');
			if (oUiModel && oUiModel.getProperty('/isEditable') === false) {
				oCheckBox.setSelected(!bSelected);
				return;
			}

			oView.setBusy(true);
			var oModel = oContext.getModel();
			var oListBinding = oModel.bindList('_Val', oContext);

			oListBinding.requestContexts(0, 50).then(function (aContexts) {
				var aDeletes = (aContexts || []).map(function (oCtx) {
					return oCtx.delete();
				});
				return Promise.all(aDeletes);
			}).then(function () {
				if (!bSelected) {
					return Promise.resolve();
				}
				var oNewContext = oListBinding.create({ Value: ALL_VALUE_TRUE });
				return oNewContext.created();
			}).then(function () {
				return that._requestPageRefresh();
			}).catch(function (oError) {
				oCheckBox.setSelected(!bSelected);
				MessageToast.show((oError && oError.message) || 'Failed to update ALL value');
			}).finally(function () {
				oView.setBusy(false);
			});
		},

		/**
		 * Open TableSelectDialog bound to ConType-specific F4 VH entity.
		 * @param {sap.ui.model.odata.v4.Context} oConContext
		 * @param {object} oVHConfig
		 * @param {string[]} aExistingValues
		 * @private
		 */
		_openEntityValueHelp: function (oConContext, oVHConfig, aExistingValues) {
			var that = this;
			var oView = this.base.getView();
			var sModelName = 'conVH';
			var aFilters = [];

			if (oVHConfig.filterByAirline) {
				var sAirline = this._getHeaderAirlineCode(oConContext);
				if (sAirline) {
					aFilters.push({
						field: oVHConfig.airlineField || 'AirlineCode',
						value: sAirline
					});
				}
			}

			if (!this._oConValueHelpDialog) {
				this._oConValueHelpDialog = new TableSelectDialog({
					title: '{conVH>/title}',
					multiSelect: true,
					growing: true,
					growingThreshold: 50,
					contentWidth: '35rem',
					columns: [
						new Column({ header: new Text({ text: '{conVH>/keyLabel}' }) }),
						new Column({
							header: new Text({ text: '{conVH>/textLabel}' }),
							visible: '{conVH>/showTextColumn}'
						})
					],
					items: {
						path: 'conVH>/items',
						template: new ColumnListItem({
							cells: [
								new Text({ text: '{conVH>key}' }),
								new Text({
									text: '{conVH>text}',
									visible: '{conVH>/showTextColumn}'
								})
							]
						})
					},
					search: function (oEvt) {
						var sValue = oEvt.getParameter('value');
						var aSearchFilters = [];
						if (sValue) {
							aSearchFilters.push(new Filter({
								filters: [
									new Filter('key', FilterOperator.Contains, sValue),
									new Filter('text', FilterOperator.Contains, sValue)
								],
								and: false
							}));
						}
						oEvt.getSource().getBinding('items').filter(aSearchFilters);
					}
				});
				this._oConValueHelpDialog.setModel(new JSONModel({
					title: '',
					keyLabel: 'Value',
					textLabel: 'Description',
					showTextColumn: true,
					items: []
				}), sModelName);
				oView.addDependent(this._oConValueHelpDialog);
			}

			// Re-bind confirm to the current condition row
			if (this._fnConVHConfirm) {
				this._oConValueHelpDialog.detachConfirm(this._fnConVHConfirm);
			}
			this._fnConVHConfirm = function (oEvt) {
				var aSelected = oEvt.getParameter('selectedItems') || [];
				var aValues = aSelected.map(function (oItem) {
					var oCtx = oItem.getBindingContext(sModelName);
					return oCtx ? oCtx.getProperty('key') : '';
				}).filter(Boolean);
				that._applySelectedValues(oConContext, aValues);
			};
			this._oConValueHelpDialog.attachConfirm(this._fnConVHConfirm);

			var oVHModel = this._oConValueHelpDialog.getModel(sModelName);
			var bShowText = !oVHConfig.hideTextColumn;
			oVHModel.setProperty('/title', oVHConfig.title || 'Select Value');
			oVHModel.setProperty('/keyLabel', oVHConfig.title || 'Value');
			oVHModel.setProperty('/textLabel', 'Description');
			oVHModel.setProperty('/showTextColumn', bShowText);
			oVHModel.setProperty('/items', []);

			oView.setBusy(true);
			this._fetchMainServiceVH(oVHConfig.entitySet, aFilters)
				.then(function (aData) {
					var sKeyField = oVHConfig.keyField;
					var sTextField = bShowText ? oVHConfig.textField : '';
					var aItems = (aData || []).map(function (oRow) {
						var sKey = oRow[sKeyField];
						var sText = sTextField ? oRow[sTextField] : '';
						return {
							key: sKey != null ? String(sKey) : '',
							text: sText != null ? String(sText) : '',
							selected: (aExistingValues || []).indexOf(String(sKey)) >= 0
						};
					}).filter(function (oItem) {
						return !!oItem.key;
					});
					oVHModel.setProperty('/items', aItems);
					that._oConValueHelpDialog.open();
				})
				.catch(function (oError) {
					MessageToast.show((oError && oError.message) || 'Failed to load value help');
				})
				.finally(function () {
					oView.setBusy(false);
				});
		},

		/**
		 * Replace _Val entries with selected VH keys.
		 * @param {sap.ui.model.odata.v4.Context} oConContext
		 * @param {string[]} aValues
		 * @private
		 */
		_applySelectedValues: function (oConContext, aValues) {
			var that = this;
			var oView = this.base.getView();
			oView.setBusy(true);
			this._deleteAllValEntries();
			var aPromises = (aValues || []).map(function (sValue) {
				return that._createValEntry(oConContext, sValue);
			});
			Promise.all(aPromises).finally(function () {
				that._requestPageRefresh().finally(function () {
					oView.setBusy(false);
				});
			});
		},

		/**
		 * Header AirlineCode for FLT default filter.
		 * @param {sap.ui.model.odata.v4.Context} oConContext
		 * @returns {string}
		 * @private
		 */
		_getHeaderAirlineCode: function (oConContext) {
			var sAirline = oConContext && oConContext.getProperty('_Header/AirlineCode');
			if (sAirline) {
				return sAirline;
			}
			var oRoot = this.base.getView().getBindingContext();
			return (oRoot && oRoot.getProperty('AirlineCode')) || '';
		},

		/**
		 * Load VH rows from main OData V4 service entity sets (not srvd_f4).
		 * @param {string} sEntitySet
		 * @param {{field:string,value:string}[]} [aFilters]
		 * @returns {Promise<object[]>}
		 * @private
		 */
		_fetchMainServiceVH: function (sEntitySet, aFilters) {
			var oModel = this.base.getView().getModel();
			var aUi5Filters = (aFilters || []).map(function (oF) {
				return new Filter(oF.field, FilterOperator.EQ, oF.value);
			});
			var oListBinding = oModel.bindList('/' + sEntitySet, null, null, aUi5Filters);
			return oListBinding.requestContexts(0, 1000).then(function (aContexts) {
				return (aContexts || []).map(function (oCtx) {
					return oCtx.getObject();
				});
			});
		},

		onTokenUpdate: function (oEvent) {
			if (oEvent.getParameter('type') === 'removed') {
				var that = this;
				var oSource = oEvent.getSource();
				var oConContext = oSource.getBindingContext();
				var oView = this.base.getView();
				var aRemovedTokens = oEvent.getParameter('removedTokens') || [];
				var aPromises = [];
				oView.setBusy(true);
				aRemovedTokens.forEach(function (oToken) {
					var oTokenContext = oToken.getBindingContext();
					if (oTokenContext) {
						aPromises.push(oTokenContext.delete());
					}
				});
				Promise.all(aPromises).then(function () {
					return that._refreshTokens(oConContext);
				}).finally(function () {
					that._requestPageRefresh().finally(function () {
						oView.setBusy(false);
					});
				});
			}
		},

		/**
		 * Input with F4 value help for Enter Range From/To (DEST/SERV/FLT/HAUL).
		 * @param {string} sValue
		 * @param {sap.ui.model.odata.v4.Context} oConContext
		 * @param {object} oVHConfig
		 * @returns {sap.m.Input}
		 * @private
		 */
		_createRangeVHInput: function (sValue, oConContext, oVHConfig) {
			var that = this;
			return new sap.m.Input({
				value: sValue || '',
				width: '100%',
				showValueHelp: true,
				valueHelpOnly: false,
				valueHelpRequest: function (oEvent) {
					that._openSingleValueHelp(oEvent.getSource(), oConContext, oVHConfig);
				}
			});
		},

		/**
		 * Single-select value help; sets the calling Input value on confirm.
		 * @param {sap.m.Input} oTargetInput
		 * @param {sap.ui.model.odata.v4.Context} oConContext
		 * @param {object} oVHConfig
		 * @private
		 */
		_openSingleValueHelp: function (oTargetInput, oConContext, oVHConfig) {
			var that = this;
			var oView = this.base.getView();
			var sModelName = 'conRangeVH';
			var aFilters = [];

			if (oVHConfig.filterByAirline) {
				var sAirline = this._getHeaderAirlineCode(oConContext);
				if (sAirline) {
					aFilters.push({
						field: oVHConfig.airlineField || 'AirlineCode',
						value: sAirline
					});
				}
			}

			if (!this._oRangeValueHelpDialog) {
				this._oRangeValueHelpDialog = new TableSelectDialog({
					title: '{conRangeVH>/title}',
					multiSelect: false,
					growing: true,
					growingThreshold: 50,
					contentWidth: '35rem',
					columns: [
						new Column({ header: new Text({ text: '{conRangeVH>/keyLabel}' }) }),
						new Column({
							header: new Text({ text: '{conRangeVH>/textLabel}' }),
							visible: '{conRangeVH>/showTextColumn}'
						})
					],
					items: {
						path: 'conRangeVH>/items',
						template: new ColumnListItem({
							cells: [
								new Text({ text: '{conRangeVH>key}' }),
								new Text({
									text: '{conRangeVH>text}',
									visible: '{conRangeVH>/showTextColumn}'
								})
							]
						})
					},
					search: function (oEvt) {
						var sValue = oEvt.getParameter('value');
						var aSearchFilters = [];
						if (sValue) {
							aSearchFilters.push(new Filter({
								filters: [
									new Filter('key', FilterOperator.Contains, sValue),
									new Filter('text', FilterOperator.Contains, sValue)
								],
								and: false
							}));
						}
						oEvt.getSource().getBinding('items').filter(aSearchFilters);
					}
				});
				this._oRangeValueHelpDialog.setModel(new JSONModel({
					title: '',
					keyLabel: 'Value',
					textLabel: 'Description',
					showTextColumn: true,
					items: []
				}), sModelName);
				oView.addDependent(this._oRangeValueHelpDialog);
			}

			if (this._fnRangeVHConfirm) {
				this._oRangeValueHelpDialog.detachConfirm(this._fnRangeVHConfirm);
			}
			this._fnRangeVHConfirm = function (oEvt) {
				var aSelected = oEvt.getParameter('selectedItems') || [];
				var oItem = aSelected[0];
				if (!oItem) {
					return;
				}
				var oCtx = oItem.getBindingContext(sModelName);
				var sKey = oCtx ? oCtx.getProperty('key') : '';
				if (sKey) {
					oTargetInput.setValue(sKey);
				}
			};
			this._oRangeValueHelpDialog.attachConfirm(this._fnRangeVHConfirm);

			var oVHModel = this._oRangeValueHelpDialog.getModel(sModelName);
			var bShowText = !oVHConfig.hideTextColumn;
			var sCurrent = oTargetInput.getValue() || '';
			oVHModel.setProperty('/title', oVHConfig.title || 'Select Value');
			oVHModel.setProperty('/keyLabel', oVHConfig.title || 'Value');
			oVHModel.setProperty('/textLabel', 'Description');
			oVHModel.setProperty('/showTextColumn', bShowText);
			oVHModel.setProperty('/items', []);

			oView.setBusy(true);
			this._fetchMainServiceVH(oVHConfig.entitySet, aFilters)
				.then(function (aData) {
					var sKeyField = oVHConfig.keyField;
					var sTextField = bShowText ? oVHConfig.textField : '';
					var aItems = (aData || []).map(function (oRow) {
						var sKey = oRow[sKeyField];
						var sText = sTextField ? oRow[sTextField] : '';
						return {
							key: sKey != null ? String(sKey) : '',
							text: sText != null ? String(sText) : '',
							selected: String(sKey) === sCurrent
						};
					}).filter(function (oItem) {
						return !!oItem.key;
					});
					oVHModel.setProperty('/items', aItems);
					that._oRangeValueHelpDialog.open();
				})
				.catch(function (oError) {
					MessageToast.show((oError && oError.message) || 'Failed to load value help');
				})
				.finally(function () {
					oView.setBusy(false);
				});
		},

		_openRangeDialog: function (oConContext, sConType, aExistingValues, sConOpt) {
			var that = this;
			var bIsTime = (sConType === 'STD');
			var bHideAddRemove = (sConOpt === 'BT' || sConOpt === 'NB');
			var oVHConfig = CON_VALUE_HELP[sConType];
			var aRows = [];

			var fnAddRow = function (sFrom, sTo) {
				var oFromInput, oToInput, oAdd, oRemove;
				if (bIsTime) {
					oFromInput = that._createTimePicker(sFrom);
					oToInput = that._createTimePicker(sTo);
				} else if (oVHConfig) {
					oFromInput = that._createRangeVHInput(sFrom, oConContext, oVHConfig);
					oToInput = that._createRangeVHInput(sTo, oConContext, oVHConfig);
				} else {
					oFromInput = new sap.m.Input({ value: sFrom, width: '100%' });
					oToInput = new sap.m.Input({ value: sTo, width: '100%' });
				}
				oAdd = new sap.m.Button({
					text: 'Add',
					type: 'Transparent',
					visible: !bHideAddRemove,
					press: function () {
						fnAddRow('', '');
					}
				});
				oRemove = new sap.m.Button({
					text: 'Remove',
					type: 'Transparent',
					visible: !bHideAddRemove,
					press: function () {
						var oItem = oRemove.getParent();
						oTable.removeItem(oItem);
						aRows = aRows.filter(function (oRow) { return oRow.item !== oItem; });
					}
				});
				var oItem = new sap.m.ColumnListItem({ cells: [oFromInput, oToInput, oAdd, oRemove] });
				oTable.addItem(oItem);
				aRows.push({ fromInput: oFromInput, toInput: oToInput, item: oItem });
			};

			var oTable = new sap.m.Table({
				growing: false,
				columns: [
						new sap.m.Column({ header: new sap.m.Text({ text: 'From' }) }),
					new sap.m.Column({ header: new sap.m.Text({ text: 'To' }) }),
					new sap.m.Column({ header: new sap.m.Text({ text: '' }), visible: !bHideAddRemove }),
					new sap.m.Column({ header: new sap.m.Text({ text: '' }), visible: !bHideAddRemove })
				]
			});

			if (aExistingValues && aExistingValues.length) {
				for (var i = 0; i < aExistingValues.length; i += 2) {
					fnAddRow(aExistingValues[i], aExistingValues[i + 1] || '');
				}
			} else {
				fnAddRow('', '');
			}

			var oDialog = new sap.m.Dialog({
				title: 'Enter Range',
				contentWidth: '45rem',
				content: [
					new sap.m.VBox({
						items: [oTable]
					}).addStyleClass('sapUiSmallMargin')
				],
				beginButton: new sap.m.Button({
					text: 'OK',
					type: 'Emphasized',
					press: function () {
						that._deleteAllValEntries();
						var aPromises = [];
						aRows.forEach(function (oRow) {
							var sFrom = that._getTimePickerStorageValue(oRow.fromInput);
							var sTo = that._getTimePickerStorageValue(oRow.toInput);
							if (sFrom) {
								aPromises.push(that._createValEntry(oConContext, sFrom));
							}
							if (sTo) {
								aPromises.push(that._createValEntry(oConContext, sTo));
							}
						});
						Promise.all(aPromises).finally(function () {
							that._requestPageRefresh().finally(function () {
								oDialog.close();
							});
						});
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function () {
					oDialog.destroy();
				}
			});
			oDialog.open();
		},

		_openTableDialog: function (oConContext, sConType, aExistingValues) {
			var that = this;
			var bIsTime = (sConType === 'STD');
			var aRows = [];

			var fnAddRow = function (sValue) {
				var oInput, oAdd, oRemove;
				if (bIsTime) {
					oInput = that._createTimePicker(sValue);
				} else {
					oInput = new sap.m.Input({ value: sValue, width: '100%' });
				}
				oAdd = new sap.m.Button({
					text: 'Add',
					type: 'Transparent',
					press: function () {
						fnAddRow('');
					}
				});
				oRemove = new sap.m.Button({
					text: 'Remove',
					type: 'Transparent',
					press: function () {
						var oItem = oRemove.getParent();
						oTable.removeItem(oItem);
						aRows = aRows.filter(function (oRow) { return oRow.item !== oItem; });
					}
				});
				var oItem = new sap.m.ColumnListItem({ cells: [oInput, oAdd, oRemove] });
				oTable.addItem(oItem);
				aRows.push({ input: oInput, item: oItem });
			};

			var oTable = new sap.m.Table({
				growing: false,
				columns: [
					new sap.m.Column({ header: new sap.m.Text({ text: 'Value' }) }),
					new sap.m.Column({ header: new sap.m.Text({ text: '' }) }),
					new sap.m.Column({ header: new sap.m.Text({ text: '' }) })
				]
			});

			if (aExistingValues && aExistingValues.length) {
				aExistingValues.forEach(fnAddRow);
			} else {
				fnAddRow('');
			}

			var oDialog = new sap.m.Dialog({
				title: 'Enter Values',
				contentWidth: '35rem',
				content: [
					new sap.m.VBox({
						items: [oTable]
					}).addStyleClass('sapUiSmallMargin')
				],
				beginButton: new sap.m.Button({
					text: 'OK',
					type: 'Emphasized',
					press: function () {
						that._deleteAllValEntries();
						var aPromises = [];
						aRows.forEach(function (oRow) {
							var sValue = that._getTimePickerStorageValue(oRow.input);
							if (sValue) {
								aPromises.push(that._createValEntry(oConContext, sValue));
							}
						});
						Promise.all(aPromises).finally(function () {
							that._requestPageRefresh().finally(function () {
								oDialog.close();
							});
						});
					}
				}),
				endButton: new sap.m.Button({
					text: 'Cancel',
					press: function () {
						oDialog.close();
					}
				}),
				afterClose: function () {
					oDialog.destroy();
				}
			});
			oDialog.open();
		},

		_deleteAllValEntries: function () {
			if (!this._currentMultiInput) {
				return;
			}
			var oTokenBinding = this._currentMultiInput.getBinding('tokens');
			if (!oTokenBinding) {
				return;
			}
			var aContexts = oTokenBinding.getContexts();
			for (var i = aContexts.length - 1; i >= 0; i--) {
				aContexts[i].delete();
			}
		},

		_createValEntry: function (oConContext, sValue) {
			var that = this;
			var oModel = oConContext.getModel();
			var oListBinding = oModel.bindList('_Val', oConContext);
			var oNewContext = oListBinding.create({ Value: sValue });
			return oNewContext.created().then(function () {
				return that._refreshTokens(oConContext);
			});
		},

		_refreshTokens: function (oConContext) {
			var that = this;
			if (!oConContext) {
				return Promise.resolve();
			}
			if (that._currentMultiInput) {
				var oTokenBinding = that._currentMultiInput.getBinding('tokens');
				if (oTokenBinding) {
					try {
						return Promise.resolve(oTokenBinding.refresh());
					} catch (e) {
						return Promise.resolve();
					}
				}
			}
			return Promise.resolve();
		},

		_requestPageRefresh: function () {
			var oRootContext = this.base.getView().getBindingContext();
			if (oRootContext) {
				return Promise.resolve(oRootContext.requestSideEffects([{ $NavigationPropertyPath: '_Con' }]));
			}
			return Promise.resolve();
		},

		/**
		 * TimePicker for STD: UI shows HH:mm, value/storage uses HH:mm:ss.
		 * @param {string} sValue stored value (HH:mm:ss or HH:mm)
		 * @returns {sap.m.TimePicker}
		 * @private
		 */
		_createTimePicker: function (sValue) {
			return new sap.m.TimePicker({
				dateValue: this._parseTimeString(sValue),
				valueFormat: "HH:mm:ss",
				displayFormat: "HH:mm",
				support2400: false,
				width: "100%"
			});
		},

		/**
		 * Read TimePicker / Input as storage string HH:mm:ss.
		 * @param {sap.m.TimePicker|sap.m.Input} oControl
		 * @returns {string}
		 * @private
		 */
		_getTimePickerStorageValue: function (oControl) {
			if (!oControl) {
				return "";
			}
			if (oControl.getDateValue) {
				var oDate = oControl.getDateValue();
				if (oDate) {
					return this._formatTime24(oDate);
				}
			}
			return this._normalizeTimeToHms(oControl.getValue && oControl.getValue());
		},

		/**
		 * Normalize HH:mm or HH:mm:ss text to HH:mm:ss for persistence.
		 * @param {string} sTime
		 * @returns {string}
		 * @private
		 */
		_normalizeTimeToHms: function (sTime) {
			var oDate = this._parseTimeString(sTime);
			return oDate ? this._formatTime24(oDate) : (sTime || "");
		},

		/**
		 * Token display: show HH:mm while key/storage remains HH:mm:ss.
		 * @param {string} sValue
		 * @returns {string}
		 */
		formatTimeToken: function (sValue) {
			if (!sValue) {
				return "";
			}
			var oDate = this._parseTimeString(sValue);
			if (oDate) {
				return DateFormat.getTimeInstance({ pattern: "HH:mm" }).format(oDate);
			}
			return sValue;
		},

		_parseTimeString: function (sTime) {
			if (!sTime) {
				return null;
			}
			var sTrim = String(sTime).trim();
			// HH:mm:ss
			var aMatchHms = sTrim.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
			if (aMatchHms) {
				var iH = parseInt(aMatchHms[1], 10);
				var iM = parseInt(aMatchHms[2], 10);
				var iS = parseInt(aMatchHms[3], 10);
				if (iH >= 0 && iH < 24 && iM < 60 && iS < 60) {
					return new Date(1970, 0, 1, iH, iM, iS);
				}
			}
			// HH:mm (seconds default 00)
			var aMatchHm = sTrim.match(/^(\d{1,2}):(\d{2})$/);
			if (aMatchHm) {
				var iH2 = parseInt(aMatchHm[1], 10);
				var iM2 = parseInt(aMatchHm[2], 10);
				if (iH2 >= 0 && iH2 < 24 && iM2 < 60) {
					return new Date(1970, 0, 1, iH2, iM2, 0);
				}
			}
			var aMatch12 = sTrim.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
			if (aMatch12) {
				var iH3 = parseInt(aMatch12[1], 10);
				var iM3 = parseInt(aMatch12[2], 10);
				var iS3 = parseInt(aMatch12[3], 10);
				var sAmpm = aMatch12[4].toUpperCase();
				if (iH3 >= 1 && iH3 <= 12 && iM3 < 60 && iS3 < 60) {
					if (sAmpm === "PM" && iH3 !== 12) { iH3 += 12; }
					if (sAmpm === "AM" && iH3 === 12) { iH3 = 0; }
					return new Date(1970, 0, 1, iH3, iM3, iS3);
				}
			}
			return null;
		},

		_formatTime24: function (oDate) {
			if (!oDate) {
				return "";
			}
			return DateFormat.getTimeInstance({ pattern: "HH:mm:ss" }).format(oDate);
		},

		_getConBinding: function () {
			var oView = this.base.getView();
			var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
				return oCtrl.isA("sap.m.Table") || oCtrl.isA("sap.ui.table.Table");
			});
			for (var i = 0; i < aTables.length; i++) {
				var oBinding = aTables[i].getBinding("items") || aTables[i].getBinding("rows");
				if (oBinding && oBinding.getPath() === "_Con") {
					return oBinding;
				}
			}
			return null;
		},

		_getActiveSector: function () {
			var oBinding = this._getConBinding();
			if (oBinding) {
				var aFilters = oBinding.aApplicationFilters || oBinding.aFilters || [];
				return this._findSectorValue(aFilters);
			}
			return null;
		},

		_findSectorValue: function (aFilters) {
			if (!aFilters || !aFilters.length) {
				return null;
			}
			for (var i = 0; i < aFilters.length; i++) {
				var oFilter = aFilters[i];
				var sPath = oFilter.sPath || (oFilter.getPath && oFilter.getPath());
				if (sPath === "Sector") {
					return oFilter.oValue1 || (oFilter.getValue1 && oFilter.getValue1());
				}
				var aSubFilters = oFilter.aFilters;
				if (aSubFilters) {
					var sResult = this._findSectorValue(aSubFilters);
					if (sResult) {
						return sResult;
					}
				}
			}
			return null;
		}
	});
});
