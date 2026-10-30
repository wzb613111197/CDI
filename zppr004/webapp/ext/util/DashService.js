sap.ui.define([
    'sap/ui/core/BusyIndicator',
    'sap/ui/model/odata/v4/ODataUtils',
    'com/cathaydining/zppr004/ext/util/Util'
], function (BusyIndicator, ODataUtils, Util) {
    'use strict';

    var DASH_ENTITY = '/ZI_PP_PROD_DASH';

    var METRIC_DEFS = [
        { field: 'ScheduleAdherence', aliases: ['ScheduleAdherencePercent'], textKey: 'metricScheduleAdherence', type: 'percent', colorField: 'SchIndicatorColor' },
        { field: 'ProductivityIndicator', aliases: ['ProductivityIndicatorPercent'], textKey: 'metricProductivityIndicator', type: 'percent', colorField: 'ProdIndicatorColor' },
        { field: 'HACCPFulfilment', aliases: ['HACCPFulfilmentPercent'], textKey: 'metricHACCPFulfilment', type: 'percent', colorField: 'HACCPIndicatorColor' },
        { field: 'NumberOfFights', aliases: ['NumberOfFlights', 'TotalCount'], textKey: 'metricNumberOfFlights', type: 'number' },
        { field: 'NumberOfFightsclosed', aliases: ['NumberOfFightsClosed', 'NumberOfFlightsClosed', 'Status03Count'], textKey: 'metricNumberOfFlightsClosed', type: 'number' }
    ];

    var NAV_TARGETS = {
        ProductionItem: {
            route: 'ZI_PP_PPD_PROD_DETAIL',
            cardFields: ['Plant', 'KeyDate', 'Department', 'ProdSupervisor', 'WorkCentre'],
            selectionFields: ['Plant', 'KeyDate', 'Department', 'ProdSupervisor', 'WorkCentre']
        },
        PlantItem: {
            route: 'ZI_PP_PPD_FLIGHT_ORDER_DETAIL',
            cardFields: ['Plant', 'KeyDate'],
            selectionFields: ['Plant', 'KeyDate']
        }
    };

    var FLIGHT_ITEM_FIELDS = ['TotalCount', 'Status03Count', 'FlightOrder', 'AirlineCode', 'FlightNum'];

    function _toRatio(vValue) {
        var fValue = parseFloat(String(vValue).replace('%', '').trim());
        if (isNaN(fValue)) {
            return null;
        }
        return fValue > 1 ? fValue / 100 : fValue;
    }

    function _formatPercentText(vValue) {
        var fRatio = _toRatio(vValue);
        if (fRatio === null) {
            return String(vValue);
        }
        return Math.round(fRatio * 100) + '%';
    }

    function _readItemProp(oItem, sName) {
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
    }

    /**
     * Backend traffic light: R red, Y yellow, G green.
     * @param {string} sColor Raw colour from service
     * @returns {string} "G" | "Y" | "R" | ""
     */
    function _normalizeColorCode(sColor) {
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
    }

    function _resolveIndicatorState(sColor) {
        switch (_normalizeColorCode(sColor)) {
            case 'G':
                return 'Success';
            case 'Y':
                return 'Warning';
            case 'R':
                return 'Error';
            default:
                return 'None';
        }
    }

    function _hasMetricField(oItem, oDef) {
        if (!oItem) {
            return false;
        }
        return [oDef.field].concat(oDef.aliases || []).some(function (sField) {
            return Object.prototype.hasOwnProperty.call(oItem, sField);
        });
    }

    function _readMetricValue(oItem, oDef) {
        var aFields = [oDef.field].concat(oDef.aliases || []);
        for (var i = 0; i < aFields.length; i++) {
            var vValue = oItem[aFields[i]];
            if (vValue !== undefined && vValue !== null && vValue !== '') {
                return vValue;
            }
        }
        return undefined;
    }

    function _readColorCode(oItem, oDef) {
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
            sCode = _normalizeColorCode(_readItemProp(oItem, aFields[i]));
            if (sCode) {
                return sCode;
            }
        }
        return '';
    }

    function _resolveNav(sKey, oItem) {
        if (NAV_TARGETS[sKey]) {
            return NAV_TARGETS[sKey];
        }
        var bFlight = FLIGHT_ITEM_FIELDS.some(function (sField) {
            return oItem[sField] !== undefined && oItem[sField] !== null && oItem[sField] !== '';
        });
        return bFlight ? NAV_TARGETS.PlantItem : NAV_TARGETS.ProductionItem;
    }

    function _fnSingle(vValue) {
        return String(vValue || '')
            .split(/[;,]/)
            .map(function (sPart) {
                return sPart.trim();
            })
            .filter(Boolean)[0] || '';
    }

    /** Split multi values (Department / Supervisor use ";"); re-join with ";". */
    function _fnMulti(vValue) {
        var aValues = String(vValue || '')
            .split(/[;,]/)
            .map(function (sPart) {
                return sPart.trim();
            })
            .filter(Boolean);
        return aValues.join(';');
    }

    var MULTI_NAV_FIELDS = {
        Department: true,
        ProdSupervisor: true,
        WorkCentre: true
    };

    function buildNavParams(oItem, oNav, oSelection, fnGetText) {
        var oParams = {};
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
            vValue = MULTI_NAV_FIELDS[sField] ? _fnMulti(vValue) : _fnSingle(vValue);
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
            vSel = MULTI_NAV_FIELDS[sField] ? _fnMulti(vSel) : _fnSingle(vSel);
            if (vSel) {
                oParams[sField] = vSel;
            }
        });
        return oParams;
    }

    function buildCard(oItem, sCollectionKey, oSelection, fnGetText) {
        oItem = oItem || {};
        var aMetrics = [];
        var bProduction = sCollectionKey === 'ProductionItem';
        // CardLevel is Production-only (D/S drill, W link). Plant always opens flight detail.
        var sItemLevel = bProduction ? String(oItem.CardLevel || '').toUpperCase() : '';
        var bDrillable = bProduction && (sItemLevel === 'D' || sItemLevel === 'S');
        var bShowLink = bProduction ? sItemLevel === 'W' : true;
        var oNav = _resolveNav(sCollectionKey, oItem);

        METRIC_DEFS.forEach(function (oDef) {
            if (!_hasMetricField(oItem, oDef)) {
                return;
            }
            var vValue = _readMetricValue(oItem, oDef);
            var bEmpty = vValue === undefined || vValue === null || vValue === '';
            var bPercent = oDef.type === 'percent';
            var fRatio = bPercent && !bEmpty ? _toRatio(vValue) : null;
            var sColorCode = bEmpty ? '' : _readColorCode(oItem, oDef);
            var sState = bEmpty ? 'None' : _resolveIndicatorState(sColorCode);
            var fCount = !bPercent && !bEmpty ? parseFloat(vValue) : NaN;
            var bClosed = String(oDef.field).toLowerCase().indexOf('closed') >= 0;
            var fPercent = fRatio === null ? 0 : Math.round(fRatio * 1000) / 10;
            aMetrics.push({
                Label: fnGetText(oDef.textKey),
                Value: bEmpty ? '—' : (bPercent ? _formatPercentText(vValue) : String(vValue)),
                Percent: fPercent,
                IsPercent: bPercent && !bEmpty,
                IsCount: !bPercent,
                CountValue: isNaN(fCount) ? 0 : fCount,
                BarWidth: fPercent > 0 ? (fPercent + '%') : '0%',
                BarSvg: bPercent && !bEmpty ? _buildPercentBarSvg(fPercent, sColorCode) : '',
                ColorCode: sColorCode,
                BarTone: bClosed ? 'Closed' : 'Open',
                State: sState
            });
        });

        // Count metrics: Plant cards toggle column chart ↔ Closed-ratio pie.
        var fMaxCount = 0;
        aMetrics.forEach(function (oMetric) {
            if (oMetric.IsCount && oMetric.CountValue > fMaxCount) {
                fMaxCount = oMetric.CountValue;
            }
        });
        var aCountMetrics = aMetrics.filter(function (oMetric) {
            return oMetric.IsCount;
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
            ? _buildColumnChartSvg(aCountMetrics, fMaxCount)
            : '';
        var sChartSvgPie = aCountMetrics.length
            ? _buildPieChartSvg(fFlights, fClosed)
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
            NavParams: oNav ? buildNavParams(oItem, oNav, oSelection, fnGetText) : {},
            Metrics: aMetrics,
            CountMetrics: aCountMetrics,
            HasCountChart: aCountMetrics.length > 0,
            ChartType: 'column',
            ChartSvgColumn: sChartSvgColumn,
            ChartSvgPie: sChartSvgPie,
            ChartSvg: sChartSvgColumn
        };
    }

    /**
     * Donut showing Closed share of Flights (Closed / Flights).
     * @param {number} fFlights Flights count
     * @param {number} fClosed Closed count
     * @returns {string} data:image/svg+xml URI
     */
    function _buildPieChartSvg(fFlights, fClosed) {
        var iW = 340;
        var iH = 200;
        var iCx = 110;
        var iCy = 96;
        var iR = 68;
        var iRi = 42;
        var fTotal = fFlights > 0 ? fFlights : 0;
        var fClosedSafe = Math.max(0, fClosed);
        var fRatio = fTotal > 0 ? Math.min(1, fClosedSafe / fTotal) : 0;
        var iPct = Math.round(fRatio * 100);
        var fRemain = Math.max(0, 1 - fRatio);

        var aParts = [];
        aParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + iW + '" height="' + iH
            + '" viewBox="0 0 ' + iW + ' ' + iH + '">');

        if (fTotal <= 0) {
            aParts.push(_donutSlice(iCx, iCy, iR, iRi, 0, 1, '#d7dee8'));
        } else if (fRatio <= 0) {
            aParts.push(_donutSlice(iCx, iCy, iR, iRi, 0, 1, '#e8edf3'));
        } else if (fRemain <= 0) {
            aParts.push(_donutSlice(iCx, iCy, iR, iRi, 0, 1, '#d32f2f'));
        } else {
            aParts.push(_donutSlice(iCx, iCy, iR, iRi, 0, fRatio, '#d32f2f'));
            aParts.push(_donutSlice(iCx, iCy, iR, iRi, fRatio, 1, '#e8edf3'));
        }

        aParts.push('<circle cx="' + iCx + '" cy="' + iCy + '" r="' + (iRi - 1)
            + '" fill="#ffffff"/>');
        aParts.push('<text x="' + iCx + '" y="' + (iCy - 4)
            + '" text-anchor="middle" fill="#1a2332" font-size="22" font-weight="700" font-family="Arial,sans-serif">'
            + iPct + '%</text>');
        aParts.push('<text x="' + iCx + '" y="' + (iCy + 16)
            + '" text-anchor="middle" fill="#5b6b7c" font-size="11" font-family="Arial,sans-serif">Closed</text>');

        var iLegX = 210;
        var iLegY = 70;
        aParts.push('<rect x="' + iLegX + '" y="' + iLegY + '" width="12" height="12" rx="2" fill="#d32f2f"/>');
        aParts.push('<text x="' + (iLegX + 18) + '" y="' + (iLegY + 10)
            + '" fill="#5b6b7c" font-size="12" font-family="Arial,sans-serif">Closed '
            + _escapeXml(String(fClosedSafe)) + '</text>');
        aParts.push('<rect x="' + iLegX + '" y="' + (iLegY + 28) + '" width="12" height="12" rx="2" fill="#e8edf3" stroke="#c5ccd6"/>');
        aParts.push('<text x="' + (iLegX + 18) + '" y="' + (iLegY + 38)
            + '" fill="#5b6b7c" font-size="12" font-family="Arial,sans-serif">Flights '
            + _escapeXml(String(fFlights)) + '</text>');

        aParts.push('</svg>');
        return 'data:image/svg+xml,' + encodeURIComponent(aParts.join(''));
    }

    /**
     * SVG donut slice from ratio a to ratio b (0..1), clockwise from 12 o'clock.
     * @private
     */
    function _donutSlice(iCx, iCy, iR, iRi, fFrom, fTo, sColor) {
        if (fTo - fFrom >= 0.999) {
            return '<circle cx="' + iCx + '" cy="' + iCy + '" r="' + ((iR + iRi) / 2)
                + '" fill="none" stroke="' + sColor + '" stroke-width="' + (iR - iRi) + '"/>';
        }
        var fStart = (fFrom * 2 * Math.PI) - Math.PI / 2;
        var fEnd = (fTo * 2 * Math.PI) - Math.PI / 2;
        var bLarge = (fTo - fFrom) > 0.5 ? 1 : 0;
        var x0 = iCx + iR * Math.cos(fStart);
        var y0 = iCy + iR * Math.sin(fStart);
        var x1 = iCx + iR * Math.cos(fEnd);
        var y1 = iCy + iR * Math.sin(fEnd);
        var x2 = iCx + iRi * Math.cos(fEnd);
        var y2 = iCy + iRi * Math.sin(fEnd);
        var x3 = iCx + iRi * Math.cos(fStart);
        var y3 = iCy + iRi * Math.sin(fStart);
        return '<path d="M ' + x0 + ' ' + y0
            + ' A ' + iR + ' ' + iR + ' 0 ' + bLarge + ' 1 ' + x1 + ' ' + y1
            + ' L ' + x2 + ' ' + y2
            + ' A ' + iRi + ' ' + iRi + ' 0 ' + bLarge + ' 0 ' + x3 + ' ' + y3
            + ' Z" fill="' + sColor + '"/>';
    }

    /**
     * Slim percent track. Fill colour from backend R / Y / G.
     * @param {number} fPercent 0..100
     * @param {string} sColorCode R | Y | G
     * @returns {string} data:image/svg+xml URI
     */
    function _buildPercentBarSvg(fPercent, sColorCode) {
        var f = Number(fPercent);
        if (isNaN(f) || f < 0) {
            f = 0;
        }
        if (f > 100) {
            f = 100;
        }
        var mFill = {
            G: '#2fad72',
            Y: '#e0a820',
            R: '#d6453d'
        };
        var sFill = mFill[_normalizeColorCode(sColorCode)] || '#9aa5b1';
        var iW = 240;
        var iH = 8;
        var iFill = Math.round(iW * f / 100);
        var aParts = [
            '<svg xmlns="http://www.w3.org/2000/svg" width="' + iW + '" height="' + iH
                + '" viewBox="0 0 ' + iW + ' ' + iH + '" preserveAspectRatio="none">',
            '<rect width="' + iW + '" height="' + iH + '" rx="2" fill="#e4e8ee"/>'
        ];
        if (iFill > 0) {
            aParts.push('<rect width="' + iFill + '" height="' + iH + '" rx="2" fill="' + sFill + '"/>');
        }
        aParts.push('</svg>');
        return 'data:image/svg+xml,' + encodeURIComponent(aParts.join(''));
    }

    /**
     * Grouped column chart with Y-axis, grid and legend (Flights blue / Closed red).
     * @param {object[]} aCountMetrics Count metrics
     * @param {number} fMaxRaw Max raw value
     * @returns {string} data:image/svg+xml URI
     */
    function _buildColumnChartSvg(aCountMetrics, fMaxRaw) {
        var iW = 340;
        var iH = 200;
        var iPadL = 42;
        var iPadR = 14;
        var iPadT = 18;
        var iPadB = 52;
        var iChartW = iW - iPadL - iPadR;
        var iChartH = iH - iPadT - iPadB;
        var fMax = _niceMax(fMaxRaw > 0 ? fMaxRaw : 1);
        var aTicks = [0, fMax / 2, fMax];
        var n = aCountMetrics.length || 1;
        var fGroupW = iChartW / n;
        var iBarW = Math.min(40, Math.max(22, fGroupW * 0.42));

        var aParts = [];
        aParts.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + iW + '" height="' + iH
            + '" viewBox="0 0 ' + iW + ' ' + iH + '">');

        aTicks.forEach(function (fTick) {
            var fRatio = fTick / fMax;
            var y = iPadT + iChartH - fRatio * iChartH;
            aParts.push('<line x1="' + iPadL + '" y1="' + y + '" x2="' + (iW - iPadR)
                + '" y2="' + y + '" stroke="#e4e8ee" stroke-width="1"/>');
            aParts.push('<text x="' + (iPadL - 6) + '" y="' + (y + 3)
                + '" text-anchor="end" fill="#6b7785" font-size="10" font-family="Arial,sans-serif">'
                + _formatAxisTick(fTick) + '</text>');
        });

        aCountMetrics.forEach(function (oMetric, i) {
            var fVal = oMetric.CountValue || 0;
            var iBarH = fVal <= 0 ? 3 : Math.max(6, Math.round((fVal / fMax) * iChartH));
            var xCenter = iPadL + fGroupW * i + fGroupW / 2;
            var x = xCenter - iBarW / 2;
            var y = iPadT + iChartH - iBarH;
            var bClosed = oMetric.BarTone === 'Closed';
            var sTop = bClosed ? '#ff8a80' : '#5eb0ff';
            var sBot = bClosed ? '#d32f2f' : '#0b6bcb';
            var sGid = 'cg' + i;
            aParts.push('<defs><linearGradient id="' + sGid + '" x1="0" y1="0" x2="0" y2="1">'
                + '<stop offset="0%" stop-color="' + sTop + '"/>'
                + '<stop offset="100%" stop-color="' + sBot + '"/>'
                + '</linearGradient></defs>');
            aParts.push('<rect x="' + x + '" y="' + y + '" width="' + iBarW + '" height="' + iBarH
                + '" rx="3" fill="url(#' + sGid + ')"/>');
            aParts.push('<text x="' + xCenter + '" y="' + (y - 4)
                + '" text-anchor="middle" fill="#1a2332" font-size="11" font-weight="700" font-family="Arial,sans-serif">'
                + (oMetric.Value || '0') + '</text>');
            var sLabel = _shortChartLabel(oMetric.Label || '');
            aParts.push('<text x="' + xCenter + '" y="' + (iPadT + iChartH + 16)
                + '" text-anchor="middle" fill="#5b6b7c" font-size="10" font-family="Arial,sans-serif">'
                + _escapeXml(sLabel) + '</text>');
        });

        aParts.push('<line x1="' + iPadL + '" y1="' + (iPadT + iChartH) + '" x2="' + (iW - iPadR)
            + '" y2="' + (iPadT + iChartH) + '" stroke="#c5ccd6" stroke-width="1.5"/>');

        var iLegY = iH - 14;
        var iLegX = iPadL;
        aCountMetrics.forEach(function (oMetric) {
            var bClosed = oMetric.BarTone === 'Closed';
            var sColor = bClosed ? '#d32f2f' : '#0b6bcb';
            var sName = _shortChartLabel(oMetric.Label || '');
            aParts.push('<rect x="' + iLegX + '" y="' + (iLegY - 8) + '" width="10" height="10" rx="2" fill="'
                + sColor + '"/>');
            aParts.push('<text x="' + (iLegX + 14) + '" y="' + iLegY
                + '" fill="#5b6b7c" font-size="10" font-family="Arial,sans-serif">'
                + _escapeXml(sName) + '</text>');
            iLegX += 14 + sName.length * 6.2 + 16;
        });

        aParts.push('</svg>');
        return 'data:image/svg+xml,' + encodeURIComponent(aParts.join(''));
    }

    function _niceMax(fValue) {
        if (fValue <= 1) {
            return 1;
        }
        var fExp = Math.pow(10, Math.floor(Math.log(fValue) / Math.LN10));
        var fNorm = fValue / fExp;
        var fNice = fNorm <= 1 ? 1 : fNorm <= 2 ? 2 : fNorm <= 5 ? 5 : 10;
        return fNice * fExp;
    }

    function _formatAxisTick(fTick) {
        if (fTick >= 1000000) {
            return (fTick / 1000000) + 'M';
        }
        if (fTick >= 1000) {
            return (fTick / 1000) + 'k';
        }
        if (fTick === Math.floor(fTick)) {
            return String(fTick);
        }
        return String(Math.round(fTick * 10) / 10);
    }

    function _shortChartLabel(sLabel) {
        var s = String(sLabel || '');
        if (s.toLowerCase().indexOf('closed') >= 0) {
            return 'Flights Closed';
        }
        if (s.toLowerCase().indexOf('flight') >= 0) {
            return 'Flights';
        }
        return s.length > 16 ? s.substring(0, 14) + '…' : s;
    }

    function _escapeXml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Service shape:
     *   ProductionItem: [ { CardLevel, CardItem: [ {...}, ... ] }, ... ]
     *   PlantItem:      [ { CardItem: [ {...}, ... ] }, ... ]  or flat card rows
     */
    function _extractCardRows(vCollection, bReadCardLevel) {
        var aRows = [];
        var sCardLevel = '';
        var aGroups = Array.isArray(vCollection)
            ? vCollection
            : (vCollection ? [vCollection] : []);

        aGroups.forEach(function (oGroup) {
            if (!oGroup) {
                return;
            }
            if (bReadCardLevel && !sCardLevel && oGroup.CardLevel) {
                sCardLevel = String(oGroup.CardLevel).toUpperCase();
            }
            var aCards = oGroup.CardItem;
            if (Array.isArray(aCards)) {
                aCards.forEach(function (oCard) {
                    if (oCard) {
                        aRows.push(oCard);
                    }
                });
                return;
            }
            // Already a flat card row (has metric / identity fields).
            if (oGroup.Department || oGroup.SubTitle || oGroup.Title
                || oGroup.WorkCentre || oGroup.Plant || oGroup.ScheduleAdherence !== undefined
                || oGroup.NumberOfFights !== undefined || oGroup.TotalCount !== undefined) {
                aRows.push(oGroup);
            }
        });

        return { rows: aRows, CardLevel: sCardLevel };
    }

    function normalizeResponse(vResponse, oSelection, fnGetText) {
        var oParsed = Array.isArray(vResponse)
            ? (vResponse[0] || {})
            : (vResponse || {});
        var oProdExtract = _extractCardRows(oParsed.ProductionItem, true);
        var oPlantExtract = _extractCardRows(oParsed.PlantItem, false);
        var sCardLevel = oProdExtract.CardLevel;

        // Legacy array-of-entries: merge remaining entries if Response is [{...},{...}].
        if (Array.isArray(vResponse) && vResponse.length > 1) {
            vResponse.slice(1).forEach(function (oEntry) {
                if (!oEntry) {
                    return;
                }
                var oMoreProd = _extractCardRows(oEntry.ProductionItem, !sCardLevel);
                var oMorePlant = _extractCardRows(oEntry.PlantItem, false);
                if (!sCardLevel && oMoreProd.CardLevel) {
                    sCardLevel = oMoreProd.CardLevel;
                }
                oProdExtract.rows = oProdExtract.rows.concat(oMoreProd.rows);
                oPlantExtract.rows = oPlantExtract.rows.concat(oMorePlant.rows);
            });
        }

        return {
            CardLevel: sCardLevel,
            productionCards: oProdExtract.rows.map(function (oItem) {
                var oNorm = Object.assign({}, oItem || {});
                if (!oNorm.CardLevel && sCardLevel) {
                    oNorm.CardLevel = sCardLevel;
                }
                return buildCard(oNorm, 'ProductionItem', oSelection, fnGetText);
            }),
            plantCards: oPlantExtract.rows.map(function (oItem) {
                return buildCard(oItem, 'PlantItem', oSelection, fnGetText);
            })
        };
    }

    /**
     * Builds ZI_PP_PROD_DASH request key:
     *   { Action: "Filter"|"Card", Data: [ { Name, Range: [{ Sign, Option, Low, High }] } ] }
     * Go → Filter; card drill / drill-back within stack → Card.
     * @param {object} oSelection Selection criteria
     * @param {string} [sAction] Filter|Card
     * @returns {{Action: string, Data: object[]}}
     */
    function buildRequestData(oSelection, sAction) {
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
            // Department / Supervisor from card drill are semicolon-separated.
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
        var fnPushKeyDate = function (oSel) {
            var sLow = Util.toIsoDate(oSel.KeyDateFrom || oSel.KeyDate).replace(/-/g, '');
            var sHigh = Util.toIsoDate(oSel.KeyDateTo || oSel.KeyDateHigh || '').replace(/-/g, '');
            if (sLow && sHigh && sLow !== sHigh) {
                fnPush('KeyDate', 'BT', sLow, sHigh);
                return;
            }
            if (sLow) {
                fnPush('KeyDate', 'EQ', sLow, '');
            }
        };

        oSelection = oSelection || {};
        fnPushMulti('Plant', oSelection.Plant);
        fnPushKeyDate(oSelection);
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
    }

    function buildSelectionSummary(oSelection, fnGetText) {
        oSelection = oSelection || {};
        var aParts = [];
        var fnPush = function (sLabelKey, sValue) {
            if (sValue) {
                aParts.push(fnGetText(sLabelKey) + ' ' + sValue);
            }
        };
        fnPush('summaryPlant', oSelection.Plant);
        fnPush('summaryDate', oSelection.KeyDate);
        fnPush('summaryShift', oSelection.ShiftName);
        fnPush('summaryDepartment', oSelection.Department);
        fnPush('summarySupervisor', oSelection.ProdSupervisor);
        fnPush('summaryWorkCentre', oSelection.WorkCentre);
        if (oSelection.ProdStartTime || oSelection.ProdEndTime) {
            aParts.push(
                fnGetText('summaryTime') + ' '
                + (oSelection.ProdStartTime || '—')
                + ' – '
                + (oSelection.ProdEndTime || '—')
            );
        }
        return aParts.join('  ·  ');
    }

    async function findODataModel(oController) {
        for (var i = 0; i < 100; i++) {
            var oView = oController.getView && oController.getView();
            var oComponent = oController.getOwnerComponent && oController.getOwnerComponent();
            var oApp = oComponent && oComponent.getAppComponent && oComponent.getAppComponent();
            var aCandidates = [
                oApp && oApp.getModel && oApp.getModel(),
                oComponent && oComponent.getModel && oComponent.getModel(),
                oView && oView.getModel && oView.getModel()
            ];
            for (var j = 0; j < aCandidates.length; j++) {
                var oCand = aCandidates[j];
                if (oCand && oCand.isA && oCand.isA('sap.ui.model.odata.v4.ODataModel')) {
                    return oCand;
                }
            }
            await new Promise(function (resolve) {
                setTimeout(resolve, 100);
            });
        }
        throw new Error('The OData model is not available');
    }

    async function requestDashboardData(oController, oSelection, sAction) {
        var oModel = await findODataModel(oController);
        var sRequest = JSON.stringify(buildRequestData(oSelection, sAction));
        var sPath = DASH_ENTITY + '('
            + encodeURIComponent(ODataUtils.formatLiteral(sRequest, 'Edm.String')) + ')';
        var oBinding = oModel.bindContext(sPath, null, {
            $$groupId: '$direct',
            $select: 'request,Response'
        });
        var oEntity = await oBinding.requestObject();
        var sResponse = oEntity && oEntity.Response;
        try {
            return JSON.parse(sResponse || '{}');
        } catch (oError) {
            throw new Error('Invalid dashboard response: ' + Util.extractErrorMessage(oError));
        }
    }

    async function loadIntoModel(oController, oSelection, oDashModel, fnGetText, sMotion, sAction) {
        BusyIndicator.show(0);
        try {
            var vResponse = await requestDashboardData(oController, oSelection, sAction);
            var oNormalized = normalizeResponse(vResponse, oSelection, fnGetText);
            oDashModel.setProperty('/hasRun', true);
            oDashModel.setProperty('/selection', oSelection);
            oDashModel.setProperty('/selectionSummary', buildSelectionSummary(oSelection, fnGetText));
            oDashModel.setProperty('/CardLevel', oNormalized.CardLevel);
            oDashModel.setProperty('/CardLevelLabel', _cardLevelLabel(oNormalized.CardLevel, fnGetText));
            oDashModel.setProperty('/productionCards', oNormalized.productionCards);
            oDashModel.setProperty('/plantCards', oNormalized.plantCards);
            scheduleCardMotion(oController, sMotion);
            return oNormalized;
        } catch (oError) {
            oDashModel.setProperty('/hasRun', true);
            oDashModel.setProperty('/CardLevel', '');
            oDashModel.setProperty('/CardLevelLabel', '');
            oDashModel.setProperty('/productionCards', []);
            oDashModel.setProperty('/plantCards', []);
            oDashModel.setProperty('/selectionSummary', buildSelectionSummary(oSelection, fnGetText));
            _clearDrillBusy(oController);
            throw oError;
        } finally {
            BusyIndicator.hide();
        }
    }

    var CARD_MOTION_CLASSES = [
        'ppdCardEnter',
        'ppdCardDrillIn',
        'ppdCardDrillInBack',
        'ppdCardDrillOut',
        'ppdCardDrillOutBack'
    ];

    var SECTION_MOTION_CLASSES = [
        'ppdSectionDrillIn',
        'ppdSectionDrillInBack',
        'ppdSectionDrillOut',
        'ppdSectionDrillOutBack'
    ];

    function _prefersReducedMotion() {
        try {
            return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
            return false;
        }
    }

    function _viewDom(oController) {
        var oView = oController && oController.getView && oController.getView();
        return oView && oView.getDomRef && oView.getDomRef();
    }

    function _clearClasses(oEl, aClasses) {
        aClasses.forEach(function (sClass) {
            oEl.classList.remove(sClass);
        });
    }

    function _clearDrillBusy(oController) {
        try {
            var oDom = _viewDom(oController);
            var oArea = oDom && oDom.querySelector && oDom.querySelector('.ppdOvpCardArea');
            if (oArea) {
                oArea.classList.remove('ppdDrillBusy');
            }
        } catch (e) {
            // ignore
        }
    }

    function _enterClass(sMotion) {
        if (sMotion === 'forward') {
            return 'ppdCardDrillIn';
        }
        if (sMotion === 'back') {
            return 'ppdCardDrillInBack';
        }
        return 'ppdCardEnter';
    }

    function _sectionEnterClass(sMotion) {
        if (sMotion === 'forward') {
            return 'ppdSectionDrillIn';
        }
        if (sMotion === 'back') {
            return 'ppdSectionDrillInBack';
        }
        return '';
    }

    /**
     * Exit animation before drill / back reloads the card grid.
     * @param {sap.ui.core.mvc.Controller} oController
     * @param {string} sDirection 'forward' | 'back'
     * @returns {Promise<void>}
     */
    function playCardExit(oController, sDirection) {
        return new Promise(function (resolve) {
            try {
                if (_prefersReducedMotion()) {
                    resolve();
                    return;
                }
                var oDom = _viewDom(oController);
                if (!oDom || !oDom.querySelectorAll) {
                    resolve();
                    return;
                }
                var aCards = oDom.querySelectorAll('.ppdOvpCard');
                if (!aCards.length) {
                    resolve();
                    return;
                }
                var sCardClass = sDirection === 'back' ? 'ppdCardDrillOutBack' : 'ppdCardDrillOut';
                var sSectionClass = sDirection === 'back' ? 'ppdSectionDrillOutBack' : 'ppdSectionDrillOut';
                var oArea = oDom.querySelector('.ppdOvpCardArea');
                if (oArea) {
                    oArea.classList.add('ppdDrillBusy');
                }
                var aSections = oDom.querySelectorAll('.ppdOvpSection');
                aSections.forEach(function (oSection) {
                    _clearClasses(oSection, SECTION_MOTION_CLASSES);
                    oSection.classList.add(sSectionClass);
                });
                aCards.forEach(function (oEl) {
                    _clearClasses(oEl, CARD_MOTION_CLASSES);
                    oEl.classList.add(sCardClass);
                });
                setTimeout(resolve, 280);
            } catch (e) {
                resolve();
            }
        });
    }

    /**
     * Re-trigger CSS enter animations after card data is rebound (Go / drill).
     * @param {sap.ui.core.mvc.Controller} oController
     * @param {string} [sMotion] 'forward' | 'back' | undefined (default fade-up)
     */
    function scheduleCardMotion(oController, sMotion) {
        setTimeout(function () {
            try {
                var oDom = _viewDom(oController);
                if (!oDom || !oDom.querySelectorAll) {
                    return;
                }
                var aCards = oDom.querySelectorAll('.ppdOvpCard');
                var oArea = oDom.querySelector('.ppdOvpCardArea');
                if (oArea) {
                    oArea.classList.remove('ppdDrillBusy');
                }
                var sCardEnter = _enterClass(sMotion);
                var sSectionEnter = _sectionEnterClass(sMotion);
                var aSections = oDom.querySelectorAll('.ppdOvpSection');
                aSections.forEach(function (oSection) {
                    _clearClasses(oSection, SECTION_MOTION_CLASSES);
                });
                if (sSectionEnter) {
                    void oDom.offsetWidth;
                    aSections.forEach(function (oSection) {
                        oSection.classList.add(sSectionEnter);
                    });
                }
                var oBadge = oDom.querySelector('.ppdProdLevelBadge');
                if (oBadge) {
                    oBadge.classList.remove('ppdBadgeEnter');
                    void oBadge.offsetWidth;
                    oBadge.classList.add('ppdBadgeEnter');
                }
                if (!aCards.length) {
                    return;
                }
                aCards.forEach(function (oEl) {
                    _clearClasses(oEl, CARD_MOTION_CLASSES);
                });
                // Force reflow so removing/adding the class restarts animation.
                void oDom.offsetWidth;
                aCards.forEach(function (oEl) {
                    oEl.classList.add(sCardEnter);
                });
            } catch (e) {
                // Motion is cosmetic; never block the data path.
            }
        }, 60);
    }

    function _cardLevelLabel(sLevel, fnGetText) {
        switch (String(sLevel || '').toUpperCase()) {
            case 'D':
                return fnGetText('levelDepartment');
            case 'S':
                return fnGetText('levelSupervisor');
            case 'W':
                return fnGetText('levelWorkCentre');
            default:
                return '';
        }
    }

    return {
        emptyDash: function () {
            return {
                hasRun: false,
                CardLevel: '',
                CardLevelLabel: '',
                drillStack: [],
                productionCards: [],
                plantCards: [],
                selection: {},
                selectionSummary: ''
            };
        },
        cardLevelLabel: _cardLevelLabel,
        loadIntoModel: loadIntoModel,
        scheduleCardMotion: scheduleCardMotion,
        playCardExit: playCardExit,
        buildSelectionSummary: buildSelectionSummary,
        buildPieChartSvg: _buildPieChartSvg,
        buildColumnChartSvg: _buildColumnChartSvg,
        buildPercentBarSvg: _buildPercentBarSvg,
        NAV_TARGETS: NAV_TARGETS
    };
});
