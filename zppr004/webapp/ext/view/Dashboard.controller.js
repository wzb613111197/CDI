sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        'sap/ui/core/routing/HashChanger',
        'sap/ui/model/json/JSONModel',
        'sap/ui/core/BusyIndicator',
        'sap/m/MessageBox',
        'sap/ui/model/odata/v4/ODataUtils',
        'com/cathaydining/zppr004/ext/util/Util',
        'com/cathaydining/zppr004/ext/util/DashService'
    ],
    function (Controller, HashChanger, JSONModel, BusyIndicator, MessageBox, ODataUtils, Util, DashService) {
        'use strict';

        // Custom entity feeding the dashboard cards: the selection criteria travel as a JSON
        // select-options payload in the "request" key, the report comes back in "Response".
        var DASH_ENTITY = '/ZI_PP_PROD_DASH';

        // Application batch group: the dashboard read is collected under this group and sent
        // to the backend as a $batch request by submitBatch().
        var BATCH_GROUP = 'dashboardReport';

        // Metric definitions per source field. Order defines the order inside the card.
        // "aliases" cover the alternative field spellings used by the backend response.
        var METRIC_DEFS = [
            { field: 'ScheduleAdherence', aliases: ['ScheduleAdherencePercent'], textKey: 'metricScheduleAdherence', type: 'percent', colorField: 'SchIndicatorColor' },
            { field: 'ProductivityIndicator', aliases: ['ProductivityIndicatorPercent'], textKey: 'metricProductivityIndicator', type: 'percent', colorField: 'ProdIndicatorColor' },
            { field: 'HACCPFulfilment', aliases: ['HACCPFulfilmentPercent'], textKey: 'metricHACCPFulfilment', type: 'percent', colorField: 'HACCPIndicatorColor' },
            { field: 'NumberOfFights', aliases: ['NumberOfFlights', 'TotalCount'], textKey: 'metricNumberOfFlights', type: 'number' },
            { field: 'NumberOfFightsclosed', aliases: ['NumberOfFightsClosed', 'NumberOfFlightsClosed', 'Status03Count'], textKey: 'metricNumberOfFlightsClosed', type: 'number' }
        ];

        // Drill-down per card collection: which List Report is opened and which fields are
        // handed over as filter values. The hash segments match the route patterns in manifest.json
        // (same approach as zsde005.createquo: HashChanger.setHash with the pattern prefix).
        var NAV_TARGETS = {
            ProductionItem: {
                route: 'ZI_PP_PPD_PROD_DETAIL',
                cardFields: ['Plant', 'KeyDate', 'Department', 'ProdSupervisor', 'WorkCentre'],
                // Include shift window so List Report ProdStartTime / ProdEndTime filters apply.
                selectionFields: [
                    'Plant', 'KeyDate', 'Department', 'ProdSupervisor', 'WorkCentre',
                    'ProdStartTime', 'ProdEndTime'
                ]
            },
            PlantItem: {
                route: 'ZI_PP_PPD_FLIGHT_ORDER_DETAIL',
                cardFields: ['Plant', 'KeyDate'],
                selectionFields: ['Plant', 'KeyDate']
            }
        };

        // Fields that only flight-summary rows carry - used to detect the row type when the
        // backend does not name the card collection "ProductionItem"/"PlantItem".
        var FLIGHT_ITEM_FIELDS = ['TotalCount', 'Status03Count', 'FlightOrder', 'AirlineCode', 'FlightNum'];

        // Selection criteria carried in the route query of this page (PascalCase, matches Main).
        var SELECTION_PARAMS = [
            'Plant', 'KeyDate', 'Department', 'ProdSupervisor',
            'WorkCentre', 'ProdStartTime', 'ProdEndTime', 'ShiftName'
        ];

        return Controller.extend('com.cathaydining.zppr004.ext.view.Dashboard', {
            /**
             * Creates the dashboard model and reloads the report whenever the Dashboard route is hit,
             * so the page also works when it is opened from a bookmarked URL.
             */
            onInit: function () {
                this.getView().setModel(new JSONModel({
                    CardLevel: '',
                    groups: [],
                    productionCards: [],
                    plantCards: [],
                    selection: {},
                    selectionSummary: ''
                }), 'dash');
                this._sLastLoadSignature = '';
                // Reload whenever the hash query changes (FPM may keep this view alive).
                this._fnHashChanged = this._onHashChanged.bind(this);
                HashChanger.getInstance().attachEvent('hashChanged', this._fnHashChanged);
                this._loadDashboard();
            },

            /**
             * Detaches the hash listener so recreated views do not leak handlers.
             */
            onExit: function () {
                if (this._fnHashChanged) {
                    HashChanger.getInstance().detachEvent('hashChanged', this._fnHashChanged);
                    this._fnHashChanged = null;
                }
                this._sLastLoadSignature = '';
            },

            onNavBack: function () {
                window.history.go(-1);
            },

            /**
             * Reloads the dashboard when navigation lands on Dashboard with (possibly new) query params.
             * @param {sap.ui.base.Event} oEvent hashChanged event
             * @private
             */
            _onHashChanged: function (oEvent) {
                var sHash = (oEvent && oEvent.getParameter('newHash'))
                    || HashChanger.getInstance().getHash()
                    || '';
                if (sHash.indexOf('Dashboard') !== 0) {
                    return;
                }
                this._loadDashboard();
            },

            /**
             * Reads the selection criteria from the hash query and loads the report payload.
             * @private
             */
            _loadDashboard: async function () {
                var sHash = HashChanger.getInstance().getHash() || '';
                var iIndex = sHash.indexOf('?');
                var oQuery = iIndex >= 0
                    ? Object.fromEntries(new URLSearchParams(sHash.substring(iIndex + 1)))
                    : {};
                var oSelection = {};
                SELECTION_PARAMS.forEach(function (sParam) {
                    oSelection[sParam] = oQuery[sParam] || '';
                });
                // Normalize times to HH:mm so the summary shows only what the user actually passed.
                oSelection.ProdStartTime = this._toDisplayTime(oSelection.ProdStartTime);
                oSelection.ProdEndTime = this._toDisplayTime(oSelection.ProdEndTime);
                var sAction = oQuery.Action === 'Card' ? 'Card' : 'Filter';

                var sSignature = SELECTION_PARAMS.map(function (sParam) {
                    return sParam + '=' + (oSelection[sParam] || '');
                }).join('&') + '&Action=' + sAction;
                if (sSignature === this._sLastLoadSignature) {
                    return;
                }
                this._sLastLoadSignature = sSignature;

                var oModel = this.getView().getModel('dash');
                oModel.setProperty('/selection', oSelection);

                BusyIndicator.show(0);
                try {
                    var vResponse = await this._requestDashboardData(oSelection, sAction);
                    var oNormalized = this._normalizeResponse(vResponse);
                    // Build summary after the async gap so the i18n model has usually propagated
                    // to the FPM view (building it earlier showed raw keys like "summaryPlant").
                    oModel.setProperty('/selectionSummary', this._buildSelectionSummary(oSelection));
                    oModel.setProperty('/CardLevel', oNormalized.CardLevel);
                    oModel.setProperty('/productionCards', oNormalized.productionCards);
                    oModel.setProperty('/plantCards', oNormalized.plantCards);
                    DashService.scheduleCardMotion(this);
                } catch (oError) {
                    oModel.setProperty('/CardLevel', '');
                    oModel.setProperty('/productionCards', []);
                    oModel.setProperty('/plantCards', []);
                    oModel.setProperty('/selectionSummary', this._buildSelectionSummary(oSelection));
                    MessageBox.error(this._getText('msgRunReportFailed', [Util.extractErrorMessage(oError)]));
                } finally {
                    BusyIndicator.hide();
                }
            },

            /**
             * Production: CardLevel D/S → Dashboard drill; W → List Report (Link).
             * @param {sap.ui.base.Event} oEvent Press event
             */
            onProductionCardPress: function (oEvent) {
                var oCard = this._getCardFromEvent(oEvent);
                if (!oCard) {
                    return;
                }
                if (oCard.Drillable) {
                    this._navigateDashboardDrill(oCard);
                    return;
                }
                if (!oCard.ShowLink || !oCard.NavRoute) {
                    return;
                }
                this._openHashRoute(oCard.NavRoute, oCard.NavParams);
            },

            /**
             * Plant → always List Report (Link).
             * @param {sap.ui.base.Event} oEvent Press event
             */
            onPlantCardPress: function (oEvent) {
                var oCard = this._getCardFromEvent(oEvent);
                if (!oCard || !oCard.ShowLink || !oCard.NavRoute) {
                    return;
                }
                this._openHashRoute(oCard.NavRoute, oCard.NavParams);
            },

            /**
             * @deprecated Kept for compatibility; prefer onProductionCardPress / onPlantCardPress.
             * @param {sap.ui.base.Event} oEvent Press event
             */
            onCardPress: function (oEvent) {
                var oCard = this._getCardFromEvent(oEvent);
                if (!oCard) {
                    return;
                }
                if (oCard.CollectionKey === 'PlantItem') {
                    this.onPlantCardPress(oEvent);
                } else {
                    this.onProductionCardPress(oEvent);
                }
            },

            _openHashRoute: function (sRoute, oParams) {
                try {
                    var sParams = new URLSearchParams(oParams || {}).toString();
                    HashChanger.getInstance().setHash(sRoute + (sParams ? '?' + sParams : ''));
                } catch (oError) {
                    MessageBox.error(this._getText('msgDrillDownFailed', [Util.extractErrorMessage(oError)]));
                }
            },

            _navigateDashboardDrill: function (oCard) {
                var oSelection = this.getView().getModel('dash').getProperty('/selection') || {};
                var sLevel = String(
                    this.getView().getModel('dash').getProperty('/CardLevel') || oCard.CardLevel || ''
                ).toUpperCase();
                var oQuery = {};
                // Keep original conditions; overlay dims by CardLevel.
                SELECTION_PARAMS.forEach(function (sKey) {
                    if (oSelection[sKey]) {
                        oQuery[sKey] = oSelection[sKey];
                    }
                });
                if (sLevel === 'D' || sLevel === 'S' || sLevel === 'W') {
                    if (oCard.Department) {
                        oQuery.Department = oCard.Department;
                    }
                }
                if (sLevel === 'S' || sLevel === 'W') {
                    var sSup = oCard.ProdSupervisor || oCard.Supervisor;
                    if (sSup) {
                        oQuery.ProdSupervisor = sSup;
                    }
                }
                if (sLevel === 'W' && oCard.WorkCentre) {
                    oQuery.WorkCentre = oCard.WorkCentre;
                }
                oQuery.Action = 'Card';
                this._openHashRoute('Dashboard', oQuery);
            },

            /**
             * Resolves the card object behind a press event (header, link, or nested metric row).
             * @param {sap.ui.base.Event} oEvent Press event
             * @returns {object|null} Card object
             * @private
             */
            _getCardFromEvent: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext && oSource.getBindingContext('dash');

                // Walk up parents until a dash context with Metrics is found (Link / Header / row).
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
                // Metric row: strip the trailing "/Metrics/<n>" to get back to the card.
                var sCardPath = oContext.getPath().replace(/\/Metrics\/\d+$/, '');
                return oContext.getModel().getProperty(sCardPath);
            },

            /**
             * Builds a compact one-line summary of the selection criteria for the dashboard sub-header.
             * @param {object} oSelection Selection criteria
             * @returns {string} Summary text
             * @private
             */
            _buildSelectionSummary: function (oSelection) {
                var aParts = [];
                var fnPush = function (sLabelKey, sValue) {
                    if (sValue) {
                        aParts.push(this._getText(sLabelKey) + ' ' + sValue);
                    }
                }.bind(this);

                fnPush('summaryPlant', oSelection.Plant);
                fnPush('summaryDate', oSelection.KeyDate);
                fnPush('summaryShift', oSelection.ShiftName);
                fnPush('summaryDepartment', oSelection.Department);
                fnPush('summarySupervisor', oSelection.ProdSupervisor);
                fnPush('summaryWorkCentre', oSelection.WorkCentre);
                if (oSelection.ProdStartTime || oSelection.ProdEndTime) {
                    aParts.push(
                        this._getText('summaryTime') + ' '
                        + (oSelection.ProdStartTime || '—')
                        + ' – '
                        + (oSelection.ProdEndTime || '—')
                    );
                }
                return aParts.join('  ·  ');
            },

            /**
             * Retrieves the dashboard payload for the given selection from the OData service.
             * The selection criteria are serialized as an ABAP select-options JSON and passed as
             * the "request" key of the ZI_PP_PROD_DASH custom entity; the entity's "Response"
             * property carries the report as a JSON string. The read is queued in an application
             * batch group, so submitBatch() sends it to the backend as a $batch request.
             * @param {object} oSelection Selection criteria
             * @returns {Promise<object|object[]>} Parsed Response JSON
             * @private
             */
            /**
             * @param {object} oSelection Selection criteria
             * @param {string} [sAction] Filter|Card
             * @returns {Promise<object|object[]>} Parsed Response JSON
             * @private
             */
            _requestDashboardData: async function (oSelection, sAction) {
                var oModel = await this._getODataModel();

                var sRequest = JSON.stringify(this._buildRequestData(oSelection, sAction));
                // The JSON is the entity key. formatLiteral produces the OData literal (escapes
                // single quotes), encodeURIComponent makes it a valid URI - the model uses the
                // path verbatim, so raw JSON would break URI parsing
                // ("Invalid URI scheme or authority detected").
                var sPath = DASH_ENTITY + '('
                    + encodeURIComponent(ODataUtils.formatLiteral(sRequest, 'Edm.String')) + ')';
                var oBinding = oModel.bindContext(sPath, null, { $$groupId: BATCH_GROUP });

                // Queue the read first, then flush the group so it travels in a $batch request.
                var pEntity = oBinding.requestObject();
                oModel.submitBatch(BATCH_GROUP);

                var oEntity = await pEntity;
                var sResponse = oEntity && oEntity.Response;
                try {
                    return JSON.parse(sResponse || '[]');
                } catch (oError) {
                    throw new Error('Invalid dashboard response: ' + Util.extractErrorMessage(oError));
                }
            },

            /**
             * Builds ZI_PP_PROD_DASH request key:
             *   { Action: "Filter"|"Card", Data: [ { Name, Range: [...] } ] }
             * @param {object} oSelection Selection criteria
             * @param {string} [sAction] Filter|Card
             * @returns {{Action: string, Data: object[]}}
             * @private
             */
            _buildRequestData: function (oSelection, sAction) {
                var aData = [];
                var fnPush = function (sName, sOption, sLow, sHigh) {
                    if (sLow) {
                        aData.push({
                            Name: sName,
                            Range: [{ Sign: 'I', Option: sOption, Low: sLow, High: sHigh || '' }]
                        });
                    }
                };
                var fnPushMulti = function (sName, sValues) {
                    var aValues = String(sValues || '')
                        .split(/[;,]/)
                        .map(function (sPart) {
                            return sPart.trim();
                        })
                        .filter(Boolean);
                    if (!aValues.length) {
                        return;
                    }
                    aData.push({
                        Name: sName,
                        Range: aValues.map(function (sValue) {
                            return { Sign: 'I', Option: 'EQ', Low: sValue, High: '' };
                        })
                    });
                };
                var sLow = Util.toIsoDate(oSelection.KeyDateFrom || oSelection.KeyDate).replace(/-/g, '');
                var sHigh = Util.toIsoDate(oSelection.KeyDateTo || oSelection.KeyDateHigh || '').replace(/-/g, '');

                fnPushMulti('Plant', oSelection.Plant);
                if (sLow && sHigh && sLow !== sHigh) {
                    fnPush('KeyDate', 'BT', sLow, sHigh);
                } else if (sLow) {
                    fnPush('KeyDate', 'EQ', sLow, '');
                }
                fnPushMulti('Department', oSelection.Department);
                fnPushMulti('ProdSupervisor', oSelection.ProdSupervisor);
                fnPushMulti('WorkCentre', oSelection.WorkCentre);
                fnPush('ShiftName', 'EQ', oSelection.ShiftName);
                fnPush('ProdStartTime', 'GE', Util.toEdmTime(oSelection.ProdStartTime).replace(/:/g, ''));
                fnPush('ProdEndTime', 'LE', Util.toEdmTime(oSelection.ProdEndTime).replace(/:/g, ''));

                return {
                    Action: sAction === 'Card' ? 'Card' : 'Filter',
                    Data: aData
                };
            },

            /**
             * Normalizes service Response into fixed Production / Plant card lists.
             * New shape:
             *   { ProductionItem: { CardLevel, Item: [] }, PlantItem: [] }
             * Legacy shape still accepted:
             *   [{ Title, ProductionItem: [], PlantItem: [] }]
             * @param {object|object[]} vResponse Parsed Response
             * @returns {{CardLevel: string, productionCards: object[], plantCards: object[]}}
             * @private
             */
            _normalizeResponse: function (vResponse) {
                var oSelection = this.getView().getModel('dash').getProperty('/selection') || {};
                // Align with DashService: ProductionItem[].CardItem[]
                var oParsed = Array.isArray(vResponse)
                    ? (vResponse[0] || {})
                    : (vResponse || {});
                var fnExtract = function (vCollection, bReadCardLevel) {
                    var aRows = [];
                    var sLevel = '';
                    var aGroups = Array.isArray(vCollection)
                        ? vCollection
                        : (vCollection ? [vCollection] : []);
                    aGroups.forEach(function (oGroup) {
                        if (!oGroup) {
                            return;
                        }
                        if (bReadCardLevel && !sLevel && oGroup.CardLevel) {
                            sLevel = String(oGroup.CardLevel).toUpperCase();
                        }
                        if (Array.isArray(oGroup.CardItem)) {
                            oGroup.CardItem.forEach(function (oCard) {
                                if (oCard) {
                                    aRows.push(oCard);
                                }
                            });
                            return;
                        }
                        if (oGroup.Department || oGroup.SubTitle || oGroup.Title
                            || oGroup.WorkCentre || oGroup.Plant
                            || oGroup.ScheduleAdherence !== undefined
                            || oGroup.NumberOfFights !== undefined
                            || oGroup.TotalCount !== undefined) {
                            aRows.push(oGroup);
                        }
                    });
                    return { rows: aRows, CardLevel: sLevel };
                };
                var oProd = fnExtract(oParsed.ProductionItem, true);
                var oPlant = fnExtract(oParsed.PlantItem, false);
                var sCardLevel = oProd.CardLevel;

                return {
                    CardLevel: sCardLevel,
                    productionCards: oProd.rows.map(function (oItem) {
                        var oNorm = Object.assign({}, oItem || {});
                        if (!oNorm.CardLevel && sCardLevel) {
                            oNorm.CardLevel = sCardLevel;
                        }
                        return this._buildCard(oNorm, 'ProductionItem', oSelection);
                    }.bind(this)),
                    plantCards: oPlant.rows.map(function (oItem) {
                        return this._buildCard(oItem, 'PlantItem', oSelection);
                    }.bind(this))
                };
            },

            /**
             * Builds a single card from a report item.
             * @param {object} oItem Report item
             * @param {string} sCollectionKey ProductionItem | PlantItem
             * @param {object} oSelection Selection criteria
             * @returns {object} Card
             * @private
             */
            _buildCard: function (oItem, sCollectionKey, oSelection) {
                oItem = oItem || {};
                var aMetrics = [];
                var bProduction = sCollectionKey === 'ProductionItem';
                // CardLevel is Production-only (D/S drill, W link). Plant always opens flight detail.
                var sItemLevel = bProduction ? String(oItem.CardLevel || '').toUpperCase() : '';
                var bDrillable = bProduction && (sItemLevel === 'D' || sItemLevel === 'S');
                var bShowLink = bProduction ? sItemLevel === 'W' : true;
                var oNav = this._resolveNav(sCollectionKey, oItem);

                METRIC_DEFS.forEach(function (oDef) {
                    if (!this._hasMetricField(oItem, oDef)) {
                        return;
                    }
                    var vValue = this._readMetricValue(oItem, oDef);
                    var bEmpty = vValue === undefined || vValue === null || vValue === '';
                    var bPercent = oDef.type === 'percent';
                    var fRatio = bPercent && !bEmpty ? this._toRatio(vValue) : null;
                    var sColorCode = bEmpty ? '' : this._readColorCode(oItem, oDef);
                    var sState = bEmpty ? 'None' : this._resolveIndicatorState(sColorCode);
                    var fPercent = fRatio === null ? 0 : Math.round(fRatio * 1000) / 10;
                    aMetrics.push({
                        Label: this._getText(oDef.textKey),
                        Value: bEmpty
                            ? '—'
                            : (bPercent ? this._formatPercentText(vValue) : String(vValue)),
                        Percent: fPercent,
                        IsPercent: bPercent && !bEmpty,
                        IsCount: !bPercent,
                        CountValue: (!bPercent && !bEmpty) ? (parseFloat(vValue) || 0) : 0,
                        BarWidth: fPercent > 0 ? (fPercent + '%') : '0%',
                        BarSvg: bPercent && !bEmpty ? DashService.buildPercentBarSvg(fPercent, sColorCode) : '',
                        ColorCode: sColorCode,
                        BarTone: String(oDef.field).toLowerCase().indexOf('closed') >= 0
                            ? 'Closed' : 'Open',
                        State: sState
                    });
                }.bind(this));

                var aCountMetrics = aMetrics.filter(function (oMetric) {
                    return oMetric.IsCount;
                });
                var fMaxCount = 0;
                aCountMetrics.forEach(function (oMetric) {
                    if (oMetric.CountValue > fMaxCount) {
                        fMaxCount = oMetric.CountValue;
                    }
                });
                var fFlights = 0;
                var fClosed = 0;
                aCountMetrics.forEach(function (oMetric) {
                    if (oMetric.BarTone === 'Closed') {
                        fClosed = oMetric.CountValue || 0;
                    } else {
                        fFlights = oMetric.CountValue || 0;
                    }
                });
                var sChartSvgColumn = aCountMetrics.length
                    ? DashService.buildColumnChartSvg(aCountMetrics, fMaxCount)
                    : '';
                var sChartSvgPie = aCountMetrics.length
                    ? DashService.buildPieChartSvg(fFlights, fClosed)
                    : '';

                var sSupervisor = oItem.Supervisor || oItem.ProdSupervisor || '';
                return {
                    Title: oItem.Title || oItem.SubTitle || oItem.CardName || '',
                    Date: oItem.Date || oItem.KeyDate || '',
                    Plant: oItem.Plant || (sCollectionKey === 'PlantItem' ? (oItem.Title || '') : ''),
                    Department: oItem.Department || '',
                    Supervisor: sSupervisor,
                    ProdSupervisor: oItem.ProdSupervisor || sSupervisor,
                    WorkCentre: oItem.WorkCentre || '',
                    CardLevel: sItemLevel,
                    CollectionKey: sCollectionKey,
                    Drillable: bDrillable,
                    ShowLink: bShowLink,
                    Navigable: bShowLink,
                    NavRoute: oNav ? oNav.route : '',
                    NavParams: oNav ? this._buildNavParams(oItem, oNav, oSelection) : {},
                    Metrics: aMetrics,
                    CountMetrics: aCountMetrics,
                    HasCountChart: aCountMetrics.length > 0,
                    ChartType: 'column',
                    ChartSvgColumn: sChartSvgColumn,
                    ChartSvgPie: sChartSvgPie,
                    ChartSvg: sChartSvgColumn
                };
            },

            /**
             * When backend omits colour codes, derive traffic light from the ratio.
             * @param {number|string} vValue Percent metric
             * @returns {string} State
             * @private
             */
            _percentFallbackState: function (vValue) {
                var fRatio = null;
                if (vValue !== undefined && vValue !== null && vValue !== '') {
                    var s = String(vValue).replace(/%/g, '').trim();
                    var f = Number(s);
                    if (!isNaN(f)) {
                        fRatio = f > 1 ? f / 100 : f;
                    }
                }
                if (fRatio === null) {
                    return 'None';
                }
                if (fRatio >= 0.95) {
                    return 'Success';
                }
                if (fRatio >= 0.85) {
                    return 'Warning';
                }
                return 'Error';
            },

            /**
             * Collects the filter values of a drill-down: the fields of the card win, the selection
             * criteria fill in what the card does not carry.
             * @param {object} oItem Report item
             * @param {object} oNav Drill-down configuration
             * @param {object} oSelection Selection criteria
             * @returns {object} Route query parameters, keyed by entity field name
             * @private
             */
            _buildNavParams: function (oItem, oNav, oSelection) {
                var oParams = {};
                var mMulti = {
                    Department: true,
                    ProdSupervisor: true,
                    WorkCentre: true
                };
                var fnNormalize = function (vValue, bMulti) {
                    var aValues = String(vValue || '')
                        .split(/[;,]/)
                        .map(function (sPart) {
                            return sPart.trim();
                        })
                        .filter(Boolean);
                    if (!aValues.length) {
                        return '';
                    }
                    return bMulti ? aValues.join(';') : aValues[0];
                };

                (oNav.cardFields || []).forEach(function (sField) {
                    var vValue = oItem[sField];
                    if (sField === 'KeyDate') {
                        vValue = Util.toIsoDate(oItem.KeyDate || oItem.Date);
                    }
                    if (sField === 'ProdSupervisor' && !vValue) {
                        vValue = oItem.Supervisor;
                    }
                    if (sField === 'Plant' && !vValue) {
                        vValue = oItem.Title;
                    }
                    vValue = fnNormalize(vValue, !!mMulti[sField]);
                    if (vValue) {
                        oParams[sField] = vValue;
                    }
                });

                (oNav.selectionFields || []).forEach(function (sField) {
                    if (oParams[sField]) {
                        return;
                    }
                    var vSel = oSelection[sField];
                    if (sField === 'KeyDate') {
                        vSel = Util.toIsoDate(vSel);
                    }
                    if (sField === 'ProdStartTime' || sField === 'ProdEndTime') {
                        vSel = Util.toEdmTime(vSel);
                    }
                    vSel = fnNormalize(vSel, !!mMulti[sField]);
                    if (vSel) {
                        oParams[sField] = vSel;
                    }
                });

                return oParams;
            },

            /**
             * Truncates Edm.TimeOfDay / HH:mm:ss to HH:mm for the selection summary.
             * @param {string} sValue Time value
             * @returns {string} HH:mm or empty
             * @private
             */
            _toDisplayTime: function (sValue) {
                if (!sValue) {
                    return '';
                }
                return String(sValue).substring(0, 5);
            },

            /**
             * Resolves the drill-down target of a card. The collection name wins when it is a
             * known one; otherwise the row type is detected from its fields - flight-summary rows
             * carry flight fields, everything else drills down into the production detail. This
             * keeps the cards navigable regardless of how the backend names the collections.
             * @param {string} sKey Name of the card collection the row came from
             * @param {object} oItem Report item
             * @returns {object} Drill-down configuration
             * @private
             */
            _resolveNav: function (sKey, oItem) {
                if (NAV_TARGETS[sKey]) {
                    return NAV_TARGETS[sKey];
                }
                var bFlight = FLIGHT_ITEM_FIELDS.some(function (sField) {
                    return oItem[sField] !== undefined && oItem[sField] !== null && oItem[sField] !== '';
                });
                return bFlight ? NAV_TARGETS.PlantItem : NAV_TARGETS.ProductionItem;
            },

            /**
             * Whether the report item declares the metric field (including null / empty).
             * Used so null ScheduleAdherence / ProductivityIndicator still produce a card row.
             * @param {object} oItem Report item
             * @param {object} oDef Metric definition
             * @returns {boolean} True when the field (or an alias) is present on the item
             * @private
             */
            _hasMetricField: function (oItem, oDef) {
                if (!oItem) {
                    return false;
                }
                var aFields = [oDef.field].concat(oDef.aliases || []);
                return aFields.some(function (sField) {
                    return Object.prototype.hasOwnProperty.call(oItem, sField);
                });
            },

            /**
             * Reads a metric value, honouring the alternative field spellings of the backend.
             * @param {object} oItem Report item
             * @param {object} oDef Metric definition
             * @returns {number|string|undefined} Raw metric value
             * @private
             */
            _readMetricValue: function (oItem, oDef) {
                var aFields = [oDef.field].concat(oDef.aliases || []);
                for (var i = 0; i < aFields.length; i++) {
                    var vValue = oItem[aFields[i]];
                    if (vValue !== undefined && vValue !== null && vValue !== '') {
                        return vValue;
                    }
                }
                return undefined;
            },

            /**
             * Reads G/Y/R colour from the metric colour field or common aliases.
             * @param {object} oItem Report item
             * @param {object} oDef Metric definition
             * @returns {string} Colour code
             * @private
             */
            _readItemProp: function (oItem, sName) {
                if (!oItem || !sName) {
                    return undefined;
                }
                if (Object.prototype.hasOwnProperty.call(oItem, sName) && oItem[sName] !== undefined) {
                    return oItem[sName];
                }
                var sWant = String(sName).replace(/_/g, '').toLowerCase();
                var aKeys = Object.keys(oItem);
                var i;
                for (i = 0; i < aKeys.length; i++) {
                    if (String(aKeys[i]).replace(/_/g, '').toLowerCase() === sWant) {
                        return oItem[aKeys[i]];
                    }
                }
                return undefined;
            },

            _normalizeColorCode: function (sColor) {
                var s = String(sColor || '').trim().toUpperCase();
                if (!s) {
                    return '';
                }
                if (s === 'SUCCESS' || s === 'GREEN') {
                    return 'G';
                }
                if (s === 'WARNING' || s === 'YELLOW') {
                    return 'Y';
                }
                if (s === 'ERROR' || s === 'RED') {
                    return 'R';
                }
                var sFirst = s.charAt(0);
                if (sFirst === 'G' || sFirst === 'Y' || sFirst === 'R') {
                    return sFirst;
                }
                if (sFirst === 'B') {
                    return 'Y';
                }
                return '';
            },

            _readColorCode: function (oItem, oDef) {
                if (!oItem || !oDef) {
                    return '';
                }
                var aFields = [
                    oDef.colorField,
                    oDef.field + 'Color',
                    oDef.field + 'IndicatorColor',
                    oDef.field + '_Color'
                ].filter(Boolean);
                var i;
                var sCode;
                for (i = 0; i < aFields.length; i++) {
                    sCode = this._normalizeColorCode(this._readItemProp(oItem, aFields[i]));
                    if (sCode) {
                        return sCode;
                    }
                }
                return '';
            },

            /**
             * Maps backend colour G / Y / R to ObjectStatus state.
             * @param {string} sColor Backend colour code
             * @returns {string} "Success" | "Warning" | "Error" | "None"
             * @private
             */
            _resolveIndicatorState: function (sColor) {
                switch (this._normalizeColorCode(sColor)) {
                    case 'G':
                        return 'Success';
                    case 'Y':
                        return 'Warning';
                    case 'R':
                        return 'Error';
                    default:
                        return 'None';
                }
            },

            /**
             * Normalizes a metric value to a 0..1 ratio. Accepts fractions (0.98), percentages (98)
             * and percentage strings ("98", "98%").
             * @param {number|string} vValue Metric value
             * @returns {number|null} Ratio or null when not numeric
             * @private
             */
            _toRatio: function (vValue) {
                var fValue = parseFloat(String(vValue).replace('%', '').trim());
                if (isNaN(fValue)) {
                    return null;
                }
                return fValue > 1 ? fValue / 100 : fValue;
            },

            /**
             * Formats a metric value as an integer percentage text.
             * @param {number|string} vValue Metric value
             * @returns {string} e.g. "98%"
             * @private
             */
            _formatPercentText: function (vValue) {
                var fRatio = this._toRatio(vValue);
                if (fRatio === null) {
                    return String(vValue);
                }
                return Math.round(fRatio * 100) + '%';
            },

            /**
             * Resolves the application component that owns models/router (not the nested FPM wrapper).
             * @returns {sap.fe.core.AppComponent|null} App component
             * @private
             */
            _getAppComponent: function () {
                var oComponent = this.getOwnerComponent && this.getOwnerComponent();
                if (oComponent && typeof oComponent.getAppComponent === 'function') {
                    return oComponent.getAppComponent();
                }
                return oComponent || null;
            },

            /**
             * Resolves the OData model. The owner component carries the model from app start
             * (preload), while it reaches the FPM view only after propagation - so the component
             * is checked first and the view is polled as a fallback for the first navigation.
             * @returns {Promise<sap.ui.model.odata.v4.ODataModel>} OData model
             * @private
             */
            _getODataModel: async function () {
                for (var i = 0; i < 100; i++) {
                    var oView = this.getView();
                    var oApp = this._getAppComponent();
                    var oComponent = this.getOwnerComponent ? this.getOwnerComponent() : null;
                    var oModel = (oApp && oApp.getModel())
                        || (oComponent && oComponent.getModel())
                        || (oView && oView.getModel());
                    if (oModel) {
                        return oModel;
                    }
                    await new Promise(function (fnResolve) {
                        setTimeout(fnResolve, 100);
                    });
                }
                throw new Error('The OData model is not available');
            },

            /**
             * Reads a translated text. Prefers the app component i18n (FPM wrapper has none).
             * @param {string} sKey Text key
             * @param {string[]} [aArgs] Placeholder values
             * @returns {string} Translated text
             * @private
             */
            _getText: function (sKey, aArgs) {
                var oView = this.getView();
                var oApp = this._getAppComponent();
                var oComponent = this.getOwnerComponent && this.getOwnerComponent();
                var oModel = (oApp && oApp.getModel('i18n'))
                    || (oView && oView.getModel('i18n'))
                    || (oComponent && oComponent.getModel('i18n'));
                var oBundle = oModel && oModel.getResourceBundle ? oModel.getResourceBundle() : null;
                return (oBundle && typeof oBundle.getText === 'function')
                    ? oBundle.getText(sKey, aArgs)
                    : sKey;
            }
        });
    }
);
