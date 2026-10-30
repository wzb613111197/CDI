sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        'sap/ui/core/routing/HashChanger',
        'sap/ui/model/json/JSONModel',
        'sap/ui/model/Filter',
        'sap/ui/model/FilterOperator',
        'sap/ui/comp/valuehelpdialog/ValueHelpDialog',
        'sap/ui/comp/filterbar/FilterBar',
        'sap/ui/comp/filterbar/FilterGroupItem',
        'sap/m/MessageBox',
        'sap/m/MessageToast',
        'sap/m/SearchField',
        'sap/m/Input',
        'sap/m/Token',
        'sap/m/Column',
        'sap/m/ColumnListItem',
        'sap/m/Label',
        'sap/m/Text',
        'sap/ui/table/Column',
        'sap/base/util/deepExtend',
        'com/cathaydining/zppr004/ext/util/Util',
        'com/cathaydining/zppr004/ext/util/DashService'
    ],
    function (
        Controller, HashChanger, JSONModel, Filter, FilterOperator,
        ValueHelpDialog, FilterBar, FilterGroupItem,
        MessageBox, MessageToast, SearchField, Input, Token,
        MColumn, ColumnListItem, Label, Text, UiColumn,
        deepExtend, Util, DashService
    ) {
        'use strict';

        // Selection criteria (PascalCase, matches OData entity fields).
        var SELECTION_PARAMS = [
            'Plant', 'KeyDate', 'Department', 'ProdSupervisor',
            'WorkCentre', 'ProdStartTime', 'ProdEndTime', 'ShiftName'
        ];

        // Multi-value selection fields (comma-separated in the sel model / URL).
        var MULTI_VALUE_FIELDS = {
            Department: true,
            ProdSupervisor: true,
            WorkCentre: true
        };

        // Value help definitions for the selection form (entity set + key/text mapping).
        var VALUE_HELPS = {
            Plant: {
                entitySet: '/I_PlantVH',
                key: 'Plant',
                text: 'PlantName',
                titleKey: 'plant',
                multi: false,
                columns: [
                    { path: 'Plant', labelKey: 'plant', filter: true },
                    { path: 'PlantName', labelKey: 'plantName', filter: true }
                ]
            },
            Department: {
                entitySet: '/ZI_PP_DEPT_MASTER_VH',
                key: 'Zdept',
                text: 'Zdeptext',
                titleKey: 'department',
                multi: true,
                columns: [
                    { path: 'Zdept', labelKey: 'department', filter: true },
                    { path: 'Zdeptext', labelKey: 'departmentText', filter: true }
                ]
            },
            ProdSupervisor: {
                entitySet: '/I_MfgOrderProdnSupervisorStdVH',
                key: 'ProductionSupervisor',
                text: 'ProductionSupervisorName',
                titleKey: 'prodSupervisor',
                multi: true,
                plantFilter: 'Plant',
                columns: [
                    { path: 'ProductionSupervisor', labelKey: 'prodSupervisor', filter: true },
                    { path: 'ProductionSupervisorName', labelKey: 'prodSupervisorText', filter: true },
                    { path: 'Plant', labelKey: 'plant', filter: false }
                ]
            },
            WorkCentre: {
                entitySet: '/I_WrkCtrBySemanticKeyStdVH',
                key: 'WorkCenter',
                text: 'WorkCenter_Text',
                titleKey: 'workCentre',
                multi: true,
                plantFilter: 'Plant',
                keyFallback: 'WorkCenterInternalID',
                columns: [
                    { path: 'WorkCenter', labelKey: 'workCentre', filter: true },
                    { path: 'WorkCenter_Text', labelKey: 'workCentreText', filter: true },
                    { path: 'Plant', labelKey: 'plant', filter: false }
                ]
            },
            ShiftName: {
                entitySet: '/ZI_PP_SHIFT_NAME_VH',
                key: 'ShiftDefinition',
                text: 'Grouping',
                titleKey: 'shiftName',
                multi: false,
                columns: [
                    { path: 'ShiftDefinition', labelKey: 'shiftName', filter: true },
                    { path: 'Grouping', labelKey: 'shiftGrouping', filter: true },
                    { path: 'StartTime', labelKey: 'prodStartTime', filter: false },
                    { path: 'EndTime', labelKey: 'prodEndTime', filter: false }
                ],
                // Extra fields written back into the selection model on confirm.
                extra: {
                    ProdStartTime: 'StartTime',
                    ProdEndTime: 'EndTime'
                },
                formatTime: true
            }
        };

        // Latest selection / dash payload survive FPM view recreation (List Report round-trip).
        var oLastSelection = null;
        var oLastDash = null;

        return Controller.extend('com.cathaydining.zppr004.ext.view.Main', {
            /**
             * Initializes the selection criteria model.
             */
            onInit: function () {
                this._oDefaultSelection = {
                    Plant: 'CDI0',
                    KeyDate: Util.todayIsoDate(),
                    Department: '',
                    ProdSupervisor: '',
                    WorkCentre: '',
                    ProdStartTime: '',
                    ProdEndTime: '',
                    ShiftName: ''
                };
                this._oVhd = null;
                this._oVhdCtx = null;
                this._mVhdFilterInputs = {};
                this._oVhdBasicSearch = null;

                var oSelModel = new JSONModel(
                    deepExtend({}, this._oDefaultSelection, oLastSelection || {}));
                oSelModel.attachPropertyChange(function () {
                    oLastSelection = deepExtend({}, oSelModel.getData());
                });
                this.getView().setModel(oSelModel, 'sel');

                var oDashModel = new JSONModel(
                    deepExtend({}, DashService.emptyDash(), oLastDash || {}));
                oDashModel.attachPropertyChange(function () {
                    oLastDash = deepExtend({}, oDashModel.getData());
                });
                this.getView().setModel(oDashModel, 'dash');

                HashChanger.getInstance().attachEvent('hashChanged', this._applyHashQuery, this);
                this._applyHashQuery();

                this.getView().attachEventOnce('afterRendering', this._syncMultiInputsFromModel, this);
            },

            /**
             * Detaches the global hash listener so recreated views do not leak handlers.
             */
            onExit: function () {
                HashChanger.getInstance().detachEvent('hashChanged', this._applyHashQuery, this);
                this._destroyValueHelpDialog();
            },

            /**
             * Applies the selection criteria carried in the hash query to the form. Hashes of the
             * other routes (Dashboard, detail lists) are ignored.
             * @private
             */
            _applyHashQuery: function () {
                var sHash = HashChanger.getInstance().getHash() || '';
                if (/^(Dashboard|ZI_PP)/.test(sHash)) {
                    return;
                }
                var iIndex = sHash.indexOf('?');
                var oQuery = iIndex >= 0
                    ? Object.fromEntries(new URLSearchParams(sHash.substring(iIndex + 1)))
                    : {};
                var oSelModel = this.getView().getModel('sel');
                SELECTION_PARAMS.forEach(function (sParam) {
                    if (oQuery[sParam]) {
                        oSelModel.setProperty('/' + sParam, oQuery[sParam]);
                    }
                });
                this._syncMultiInputsFromModel();
            },

            /**
             * Opens the standard sap.ui.comp ValueHelpDialog for the requesting control.
             * @param {sap.ui.base.Event} oEvent valueHelpRequest event
             */
            onValueHelpRequest: function (oEvent) {
                var oInput = oEvent.getSource();
                var sField = oInput.data('vhField');
                var oDef = VALUE_HELPS[sField];
                if (!oDef) {
                    return;
                }

                // WorkCentre / ProdSupervisor require Plant as an IN parameter.
                if (oDef.plantFilter && !this.getView().getModel('sel').getProperty('/Plant')) {
                    MessageToast.show(this._getText('msgPlantRequiredForValueHelp'));
                    return;
                }

                this._destroyValueHelpDialog();
                this._oVhdCtx = {
                    field: sField,
                    def: oDef,
                    source: oInput,
                    rowsByKey: {}
                };

                this._openStandardValueHelpDialog();
            },

            /**
             * Creates and opens sap.ui.comp.valuehelpdialog.ValueHelpDialog.
             * @private
             */
            _openStandardValueHelpDialog: function () {
                var oDef = this._oVhdCtx.def;
                var sTitle = this._getText(oDef.titleKey);
                var aCurrentKeys = this._parseValues(
                    this.getView().getModel('sel').getProperty('/' + this._oVhdCtx.field));

                this._oVhdBasicSearch = new SearchField({
                    width: '100%',
                    search: function () {
                        this._rebindValueHelpTable();
                    }.bind(this)
                });

                var oFilterBar = new FilterBar({
                    advancedMode: true,
                    search: this._rebindValueHelpTable.bind(this),
                    isRunningInValueHelpDialog: true,
                    showGoOnFB: !sap.ui.Device.system.phone,
                    filterBarExpanded: true
                });
                oFilterBar.setBasicSearch(this._oVhdBasicSearch);
                this._mVhdFilterInputs = {};
                (oDef.columns || []).forEach(function (oCol) {
                    if (!oCol.filter) {
                        return;
                    }
                    var oFilterInput = new Input({
                        name: oCol.path,
                        submit: this._rebindValueHelpTable.bind(this)
                    });
                    this._mVhdFilterInputs[oCol.path] = oFilterInput;
                    oFilterBar.addFilterGroupItem(new FilterGroupItem({
                        groupName: '__BASIC',
                        name: oCol.path,
                        label: this._getText(oCol.labelKey),
                        visibleInFilterBar: true,
                        control: oFilterInput
                    }));
                }.bind(this));

                this._oVhd = new ValueHelpDialog({
                    title: sTitle,
                    key: oDef.key,
                    descriptionKey: oDef.text || oDef.key,
                    supportMultiselect: !!oDef.multi,
                    supportRanges: true,
                    ok: this._onValueHelpOk.bind(this),
                    cancel: this._onValueHelpCancel.bind(this),
                    afterClose: this._destroyValueHelpDialog.bind(this)
                });
                this._oVhd.setFilterBar(oFilterBar);
                this._oVhd.setRangeKeyFields([{
                    label: sTitle,
                    key: oDef.key,
                    type: 'string',
                    maxLength: 40
                }]);
                this._oVhd.setTokens(aCurrentKeys.map(function (sKey) {
                    return new Token({ key: sKey, text: sKey });
                }));

                this.getView().addDependent(this._oVhd);

                this._oVhd.getTableAsync().then(function (oTable) {
                    this._oVhdCtx.table = oTable;
                    this._setupValueHelpTable(oTable, oDef);
                    this._rebindValueHelpTable();
                    this._oVhd.update();
                }.bind(this));

                this._oVhd.open();
            },

            /**
             * Adds columns to the ValueHelpDialog table (ui.table or m.Table).
             * @param {sap.ui.table.Table|sap.m.Table} oTable Dialog table
             * @param {object} oDef Value help definition
             * @private
             */
            _setupValueHelpTable: function (oTable, oDef) {
                if (oTable.bindRows) {
                    // sap.ui.table.Table
                    (oDef.columns || []).forEach(function (oCol) {
                        oTable.addColumn(new UiColumn({
                            label: new Label({ text: this._getText(oCol.labelKey) }),
                            template: new Text({ text: '{' + oCol.path + '}' }),
                            width: oCol.path === oDef.key ? '10rem' : '12rem'
                        }));
                    }.bind(this));
                } else if (oTable.bindItems) {
                    // sap.m.Table
                    oTable.destroyColumns();
                    (oDef.columns || []).forEach(function (oCol) {
                        oTable.addColumn(new MColumn({
                            header: new Label({ text: this._getText(oCol.labelKey) })
                        }));
                    }.bind(this));
                }
            },

            /**
             * (Re)binds the ValueHelpDialog table with Plant IN + FilterBar filters.
             * @private
             */
            _rebindValueHelpTable: function () {
                var oDef = this._oVhdCtx && this._oVhdCtx.def;
                var oTable = this._oVhdCtx && this._oVhdCtx.table;
                if (!oDef || !oTable) {
                    return;
                }

                var aFilters = this._buildValueHelpFilters(oDef);
                this._oVhdCtx.rowsByKey = {};

                if (oTable.bindRows) {
                    oTable.bindRows({
                        path: oDef.entitySet,
                        filters: aFilters,
                        parameters: { $count: true },
                        events: {
                            dataReceived: this._onValueHelpDataReceived.bind(this)
                        }
                    });
                } else if (oTable.bindItems) {
                    var aCells = (oDef.columns || []).map(function (oCol) {
                        return new Text({ text: '{' + oCol.path + '}' });
                    });
                    oTable.bindItems({
                        path: oDef.entitySet,
                        filters: aFilters,
                        template: new ColumnListItem({ cells: aCells }),
                        templateShareable: false,
                        parameters: { $count: true },
                        events: {
                            dataReceived: this._onValueHelpDataReceived.bind(this)
                        }
                    });
                }

                if (this._oVhd) {
                    this._oVhd.update();
                }
            },

            /**
             * Caches loaded rows (for Shift time backfill) and refreshes VHD selection state.
             * @private
             */
            _onValueHelpDataReceived: function () {
                var oDef = this._oVhdCtx.def;
                var oTable = this._oVhdCtx.table;
                var aContexts = [];

                if (oTable.getBinding && oTable.getBinding('rows')) {
                    aContexts = oTable.getBinding('rows').getCurrentContexts
                        ? oTable.getBinding('rows').getCurrentContexts()
                        : (oTable.getBinding('rows').getContexts
                            ? oTable.getBinding('rows').getContexts()
                            : []);
                } else if (oTable.getItems) {
                    aContexts = oTable.getItems().map(function (oItem) {
                        return oItem.getBindingContext();
                    }).filter(Boolean);
                }

                aContexts.forEach(function (oCtx) {
                    if (!oCtx) {
                        return;
                    }
                    var oRow = oCtx.getObject() || {};
                    var sKey = this._readRowKey(oRow, oDef);
                    if (sKey) {
                        this._oVhdCtx.rowsByKey[sKey] = oRow;
                    }
                }.bind(this));

                if (this._oVhd) {
                    this._oVhd.update();
                }
            },

            /**
             * Builds OData filters for the open value help (Plant IN + FilterBar + basic search).
             * @param {object} oDef Value help definition
             * @returns {sap.ui.model.Filter[]} Filters
             * @private
             */
            _buildValueHelpFilters: function (oDef) {
                var aFilters = [];
                var sPlant = this.getView().getModel('sel').getProperty('/Plant');

                if (oDef.plantFilter && sPlant) {
                    aFilters.push(new Filter(oDef.plantFilter, FilterOperator.EQ, String(sPlant).trim()));
                }

                Object.keys(this._mVhdFilterInputs || {}).forEach(function (sPath) {
                    var sValue = (this._mVhdFilterInputs[sPath].getValue() || '').trim();
                    if (sValue) {
                        aFilters.push(new Filter(sPath, FilterOperator.Contains, sValue));
                    }
                }.bind(this));

                var sBasic = this._oVhdBasicSearch
                    ? (this._oVhdBasicSearch.getValue() || '').trim()
                    : '';
                if (sBasic) {
                    var aSearch = [new Filter(oDef.key, FilterOperator.Contains, sBasic)];
                    if (oDef.text) {
                        aSearch.push(new Filter(oDef.text, FilterOperator.Contains, sBasic));
                    }
                    aFilters.push(new Filter({ filters: aSearch, and: false }));
                }

                return aFilters;
            },

            /**
             * OK handler of the standard ValueHelpDialog.
             * @param {sap.ui.base.Event} oEvent ok event
             * @private
             */
            _onValueHelpOk: function (oEvent) {
                var aTokens = oEvent.getParameter('tokens') || [];
                var aKeys = aTokens.map(function (oToken) {
                    return oToken.getKey() || oToken.getText();
                }).filter(Boolean);
                var sField = this._oVhdCtx.field;
                var oDef = this._oVhdCtx.def;
                var oSelModel = this.getView().getModel('sel');

                if (!oDef.multi && aKeys.length > 1) {
                    aKeys = [aKeys[0]];
                }

                oSelModel.setProperty('/' + sField, aKeys.join(';'));
                this._syncMultiInputTokens(sField, aKeys);

                // Single-value Input fields (Plant / ShiftName).
                if (!MULTI_VALUE_FIELDS[sField] && this._oVhdCtx.source) {
                    this._oVhdCtx.source.setValue(aKeys[0] || '');
                }

                // ShiftName → bring ProdStartTime / ProdEndTime back into the filter form.
                if (oDef.extra && aKeys.length) {
                    this._applyShiftExtrasFromKey(oDef, aKeys[0]);
                }

                this._oVhd.close();
            },

            /**
             * Cancel handler of the standard ValueHelpDialog.
             * @private
             */
            _onValueHelpCancel: function () {
                this._oVhd.close();
            },

            /**
             * Destroys the current ValueHelpDialog instance.
             * @private
             */
            _destroyValueHelpDialog: function () {
                if (this._oVhd) {
                    this._oVhd.destroy();
                    this._oVhd = null;
                }
                this._oVhdBasicSearch = null;
                this._mVhdFilterInputs = {};
                this._oVhdCtx = null;
            },

            /**
             * Copies Start/End time from the selected shift row into the selection form.
             * @param {object} oDef Value help definition
             * @param {string} sKey Selected shift key
             * @private
             */
            _applyShiftExtrasFromKey: function (oDef, sKey) {
                var oRow = this._oVhdCtx && this._oVhdCtx.rowsByKey
                    ? this._oVhdCtx.rowsByKey[sKey]
                    : null;
                if (!oRow) {
                    return;
                }
                var oSelModel = this.getView().getModel('sel');
                Object.keys(oDef.extra).forEach(function (sSelKey) {
                    var vExtra = oRow[oDef.extra[sSelKey]];
                    if (oDef.formatTime) {
                        vExtra = this._toHm(vExtra);
                    }
                    if (vExtra) {
                        oSelModel.setProperty('/' + sSelKey, vExtra);
                    }
                }.bind(this));
            },

            /**
             * Reads the business key from a value help row.
             * @param {object} oRow Row data
             * @param {object} oDef Value help definition
             * @returns {string} Key
             * @private
             */
            _readRowKey: function (oRow, oDef) {
                var vKey = oRow[oDef.key];
                if ((vKey === undefined || vKey === null || vKey === '') && oDef.keyFallback) {
                    vKey = oRow[oDef.keyFallback];
                }
                return vKey != null && vKey !== '' ? String(vKey) : '';
            },

            /**
             * Splits a stored multi-value string into discrete keys.
             * @param {string} sValue Comma / semicolon separated values
             * @returns {string[]} Keys
             * @private
             */
            _parseValues: function (sValue) {
                return String(sValue || '')
                    .split(/[,;]/)
                    .map(function (sPart) {
                        return sPart.trim();
                    })
                    .filter(Boolean);
            },

            /**
             * Writes tokens onto the form MultiInput for a multi-value field.
             * @param {string} sField Field name
             * @param {string[]} aKeys Keys
             * @private
             */
            _syncMultiInputTokens: function (sField, aKeys) {
                if (!MULTI_VALUE_FIELDS[sField]) {
                    return;
                }
                var oControl = this.byId(
                    sField === 'Department' ? 'departmentInput'
                        : sField === 'ProdSupervisor' ? 'prodSupervisorInput'
                            : sField === 'WorkCentre' ? 'workCentreInput'
                                : null
                );
                if (!oControl || !oControl.removeAllTokens) {
                    return;
                }
                oControl.removeAllTokens();
                (aKeys || []).forEach(function (sKey) {
                    oControl.addToken(new Token({ key: sKey, text: sKey }));
                });
                oControl.setValue('');
            },

            /**
             * Restores MultiInput tokens from the sel model (after init / hash restore / reset).
             * @private
             */
            _syncMultiInputsFromModel: function () {
                var oSel = this.getView().getModel('sel');
                if (!oSel) {
                    return;
                }
                Object.keys(MULTI_VALUE_FIELDS).forEach(function (sField) {
                    this._syncMultiInputTokens(sField, this._parseValues(oSel.getProperty('/' + sField)));
                }.bind(this));
            },

            /**
             * Keeps the sel model in sync when the user edits MultiInput tokens on the form.
             * @param {sap.ui.base.Event} oEvent tokenUpdate event
             */
            onMultiInputTokenUpdate: function (oEvent) {
                var oInput = oEvent.getSource();
                var sField = oInput.data('vhField');
                setTimeout(function () {
                    var aKeys = (oInput.getTokens() || []).map(function (oToken) {
                        return oToken.getKey() || oToken.getText();
                    }).filter(Boolean);
                    this.getView().getModel('sel').setProperty('/' + sField, aKeys.join(';'));
                }.bind(this), 0);
            },

            /**
             * Adds a manually typed value as a token on the form MultiInput.
             * @param {sap.ui.base.Event} oEvent submit event
             */
            onMultiInputSubmit: function (oEvent) {
                var oInput = oEvent.getSource();
                var sField = oInput.data('vhField');
                var sValue = (oInput.getValue() || '').trim();
                if (!sValue) {
                    return;
                }
                if (!oInput.getTokens().some(function (oToken) {
                    return oToken.getKey() === sValue;
                })) {
                    oInput.addToken(new Token({ key: sValue, text: sValue }));
                }
                oInput.setValue('');
                var aKeys = (oInput.getTokens() || []).map(function (oToken) {
                    return oToken.getKey() || oToken.getText();
                }).filter(Boolean);
                this.getView().getModel('sel').setProperty('/' + sField, aKeys.join(';'));
            },

            /**
             * Truncates an Edm.TimeOfDay / HH:mm:ss value to HH:mm for the TimePicker.
             * @param {string} sValue Time value
             * @returns {string} HH:mm or empty
             * @private
             */
            _toHm: function (sValue) {
                if (!sValue) {
                    return '';
                }
                return String(sValue).substring(0, 5);
            },

            /**
             * Standard FilterBar "Go": query with current Filter form values.
             * Clears Production drill history (drill does not mutate the form).
             */
            onGo: async function () {
                this._flushMultiInputsToModel();

                var oSelection = deepExtend({}, this.getView().getModel('sel').getData());

                if (!this._validateSelection(oSelection)) {
                    return;
                }

                if (oSelection.ProdStartTime) {
                    oSelection.ProdStartTime = this._toHm(oSelection.ProdStartTime);
                }
                if (oSelection.ProdEndTime) {
                    oSelection.ProdEndTime = this._toHm(oSelection.ProdEndTime);
                }

                // Fresh Go resets drill breadcrumb.
                this.getView().getModel('dash').setProperty('/drillStack', []);

                try {
                    await this._runQuery(oSelection, null, 'Filter');
                    var oPage = this.byId('selectionPage');
                    if (oPage && oPage.setHeaderExpanded) {
                        oPage.setHeaderExpanded(false);
                    }
                } catch (oError) {
                    MessageBox.error(this._getText('msgRunReportFailed', [Util.extractErrorMessage(oError)]));
                }
            },

            /** @deprecated Use onGo (FilterBar naming). */
            onRunReport: function () {
                return this.onGo();
            },

            /**
             * @param {object} oSelection Selection criteria
             * @param {string} [sMotion] Card motion direction
             * @param {string} [sAction] Filter (Go) | Card (drill)
             * @returns {Promise}
             * @private
             */
            _runQuery: async function (oSelection, sMotion, sAction) {
                await DashService.loadIntoModel(
                    this,
                    oSelection,
                    this.getView().getModel('dash'),
                    this._getText.bind(this),
                    sMotion,
                    sAction
                );
            },

            /**
             * Production: D/S → drill filters + reload below; W → List Report.
             */
            onProductionCardPress: function (oEvent) {
                var oCard = this._getCardFromEvent(oEvent);
                if (!oCard) {
                    return;
                }
                if (oCard.Drillable) {
                    this._drillInline(oCard);
                    return;
                }
                if (!oCard.ShowLink || !oCard.NavRoute) {
                    return;
                }
                // W: keep original criteria; overlay Department + Supervisor + WorkCentre.
                this._openHashRoute(oCard.NavRoute, this._buildProductionNavParams(oCard));
            },

            onPlantCardPress: function (oEvent) {
                var oCard = this._getCardFromEvent(oEvent);
                if (!oCard || !oCard.ShowLink || !oCard.NavRoute) {
                    return;
                }
                this._openHashRoute(oCard.NavRoute, oCard.NavParams);
            },

            /**
             * Restore previous Production query level from drill stack.
             * Filter form stays as the user's current criteria (Go uses that).
             */
            onDrillBack: async function () {
                var oDash = this.getView().getModel('dash');
                var aStack = (oDash.getProperty('/drillStack') || []).slice();
                if (!aStack.length) {
                    return;
                }
                var oPrev = aStack.pop();
                oDash.setProperty('/drillStack', aStack);
                try {
                    await DashService.playCardExit(this, 'back');
                    // Empty stack → back to Go selection (Filter); otherwise still in drill (Card).
                    await this._runQuery(deepExtend({}, oPrev), 'back', aStack.length ? 'Card' : 'Filter');
                } catch (oError) {
                    MessageBox.error(this._getText('msgRunReportFailed', [Util.extractErrorMessage(oError)]));
                }
            },

            /**
             * Drill overlays card dims onto the last query selection only.
             * Filter form is left unchanged so Go always re-queries current Filter.
             * D → Department; S → Department + Supervisor.
             * @param {object} oCard Card
             * @private
             */
            _drillInline: async function (oCard) {
                var oDash = this.getView().getModel('dash');
                var sLevel = String(
                    oDash.getProperty('/CardLevel') || oCard.CardLevel || ''
                ).toUpperCase();
                var oBase = deepExtend(
                    {},
                    oDash.getProperty('/selection') || this.getView().getModel('sel').getData()
                );
                var aStack = (oDash.getProperty('/drillStack') || []).slice();
                aStack.push(deepExtend({}, oBase));
                oDash.setProperty('/drillStack', aStack);

                var oSelection = this._withProductionDims(oBase, oCard, sLevel);
                if (oSelection.ProdStartTime) {
                    oSelection.ProdStartTime = this._toHm(oSelection.ProdStartTime);
                }
                if (oSelection.ProdEndTime) {
                    oSelection.ProdEndTime = this._toHm(oSelection.ProdEndTime);
                }
                try {
                    await DashService.playCardExit(this, 'forward');
                    await this._runQuery(oSelection, 'forward', 'Card');
                } catch (oError) {
                    aStack.pop();
                    oDash.setProperty('/drillStack', aStack);
                    MessageBox.error(this._getText('msgRunReportFailed', [Util.extractErrorMessage(oError)]));
                }
            },

            /**
             * Overlay Production dimensions by CardLevel onto a selection copy.
             * D: Department; S: Department + Supervisor; W: Department + Supervisor + WorkCentre.
             * @param {object} oBase Base selection
             * @param {object} oCard Card
             * @param {string} sLevel D|S|W
             * @returns {object} New selection
             * @private
             */
            _withProductionDims: function (oBase, oCard, sLevel) {
                var oNext = deepExtend({}, oBase || {});
                oCard = oCard || {};
                sLevel = String(sLevel || '').toUpperCase();
                var sDepartment = oCard.Department || '';
                var sSupervisor = oCard.ProdSupervisor || oCard.Supervisor || '';
                var sWorkCentre = oCard.WorkCentre || '';

                if (sLevel === 'D' || sLevel === 'S' || sLevel === 'W') {
                    if (sDepartment) {
                        oNext.Department = sDepartment;
                    }
                }
                if (sLevel === 'S' || sLevel === 'W') {
                    if (sSupervisor) {
                        oNext.ProdSupervisor = sSupervisor;
                    }
                }
                if (sLevel === 'W') {
                    if (sWorkCentre) {
                        oNext.WorkCentre = sWorkCentre;
                    }
                }
                return oNext;
            },

            /**
             * List Report params for Production W: only non-empty, FilterBar-known fields.
             * Plant + KeyDate + Department/Supervisor/WorkCentre; times only if set.
             * @param {object} oCard Card
             * @returns {object} Query params
             * @private
             */
            _buildProductionNavParams: function (oCard) {
                var oSel = this.getView().getModel('sel').getData() || {};
                var oParams = {};
                var fnPut = function (sKey, vValue, bMulti) {
                    if (vValue === undefined || vValue === null) {
                        return;
                    }
                    var aValues = String(vValue)
                        .split(/[;]/)
                        .map(function (sPart) {
                            return sPart.trim();
                        })
                        .filter(Boolean);
                    if (!aValues.length) {
                        return;
                    }
                    // Department / Supervisor / WorkCentre: keep all values, joined by ";".
                    oParams[sKey] = bMulti ? aValues.join(';') : aValues[0];
                };

                fnPut('Plant', oSel.Plant, false);
                fnPut('KeyDate', Util.toIsoDate(oSel.KeyDate) || oSel.KeyDate, false);

                // W dims from card (fallback to current selection); multi → semicolon list.
                fnPut('Department', oCard.Department || oSel.Department, true);
                fnPut('ProdSupervisor', oCard.ProdSupervisor || oCard.Supervisor || oSel.ProdSupervisor, true);
                fnPut('WorkCentre', oCard.WorkCentre || oSel.WorkCentre, true);

                // Times only when the user actually entered them.
                var sStart = Util.toEdmTime(oSel.ProdStartTime);
                var sEnd = Util.toEdmTime(oSel.ProdEndTime);
                if (sStart) {
                    fnPut('ProdStartTime', sStart, false);
                }
                if (sEnd) {
                    fnPut('ProdEndTime', sEnd, false);
                }

                return oParams;
            },

            /**
             * Writes current MultiInput tokens back into the sel model (Go / Reset safety).
             * @private
             */
            _flushMultiInputsToModel: function () {
                var oSel = this.getView().getModel('sel');
                Object.keys(MULTI_VALUE_FIELDS).forEach(function (sField) {
                    var sId = sField === 'Department' ? 'departmentInput'
                        : sField === 'ProdSupervisor' ? 'prodSupervisorInput'
                            : 'workCentreInput';
                    var oInput = this.byId(sId);
                    if (!oInput || !oInput.getTokens) {
                        return;
                    }
                    var aKeys = (oInput.getTokens() || []).map(function (oToken) {
                        return oToken.getKey() || oToken.getText();
                    }).filter(Boolean);
                    // Backend / card drill uses semicolon-separated multi values.
                    oSel.setProperty('/' + sField, aKeys.join(';'));
                }.bind(this));
            },

            _openHashRoute: function (sRoute, oParams) {
                try {
                    var sParams = new URLSearchParams(oParams || {}).toString();
                    HashChanger.getInstance().setHash(sRoute + (sParams ? '?' + sParams : ''));
                } catch (oError) {
                    MessageBox.error(this._getText('msgDrillDownFailed', [Util.extractErrorMessage(oError)]));
                }
            },

            _getCardFromEvent: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext && oSource.getBindingContext('dash');
                var oControl = oSource;
                while (!oContext && oControl && oControl.getParent) {
                    oControl = oControl.getParent();
                    oContext = oControl.getBindingContext && oControl.getBindingContext('dash');
                }
                if (!oContext) {
                    return null;
                }
                var oObject = oContext.getObject();
                if (oObject && oObject.Metrics) {
                    return oObject;
                }
                var sCardPath = oContext.getPath().replace(/\/Metrics\/\d+$/, '');
                return oContext.getModel().getProperty(sCardPath);
            },

            /**
             * Handler for "Reset": restores the initial selection values and clears cards.
             */
            onReset: function () {
                this.getView().getModel('sel').setData(deepExtend({}, this._oDefaultSelection));
                this.getView().getModel('dash').setData(DashService.emptyDash());
                oLastDash = null;
                this._syncMultiInputsFromModel();
                this._clearValueStates();
                var oPage = this.byId('selectionPage');
                if (oPage && oPage.setHeaderExpanded) {
                    oPage.setHeaderExpanded(true);
                }
                MessageToast.show(this._getText('msgSelectionReset'));
            },

            /**
             * Validates the mandatory selection fields and marks the offending controls.
             * @param {object} oSelection Selection criteria
             * @returns {boolean} true when all mandatory fields are filled
             * @private
             */
            _validateSelection: function (oSelection) {
                // Same mandatory set as the selection hint: Plant, Key Date, Shift.
                var aChecks = [
                    { id: 'plantInput', value: oSelection.Plant },
                    { id: 'keyDatePicker', value: oSelection.KeyDate }
                ];
                var bValid = true;

                aChecks.forEach(function (oCheck) {
                    var oControl = this.byId(oCheck.id);
                    if (!oControl) {
                        return;
                    }
                    if (!oCheck.value) {
                        oControl.setValueState('Error');
                        oControl.setValueStateText(this._getText('msgFieldRequired'));
                        bValid = false;
                    } else {
                        oControl.setValueState('None');
                    }
                }.bind(this));

                if (!bValid) {
                    MessageToast.show(this._getText('msgMandatoryFieldsMissing'));
                }

                return bValid;
            },

            /**
             * Resets the value states of the mandatory controls.
             * @private
             */
            _clearValueStates: function () {
                ['plantInput', 'keyDatePicker', 'shiftNameInput'].forEach(function (sId) {
                    var oControl = this.byId(sId);
                    if (oControl) {
                        oControl.setValueState('None');
                    }
                }.bind(this));
            },

            /**
             * Reads a translated text.
             * @param {string} sKey Text key
             * @param {string[]} [aArgs] Placeholder values
             * @returns {string} Translated text
             * @private
             */
            _getText: function (sKey, aArgs) {
                return this.getView().getModel('i18n').getResourceBundle().getText(sKey, aArgs);
            }
        });
    }
);
