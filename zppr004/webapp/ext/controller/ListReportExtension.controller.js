sap.ui.define([
    'sap/ui/core/mvc/ControllerExtension',
    'sap/ui/mdc/p13n/StateUtil',
    'sap/ui/mdc/condition/Condition',
    'sap/base/Log'
], function (ControllerExtension, StateUtil, Condition, Log) {
    'use strict';

    // Drill dimensions that must be overwritten (not appended) on each navigation.
    var OVERWRITE_FIELDS = [
        'Plant', 'KeyDate', 'Department', 'ProdSupervisor',
        'WorkCentre', 'ProdStartTime', 'ProdEndTime'
    ];

    // Drill-down may pass semicolon-separated values for these FilterBar fields.
    var MULTI_VALUE_FIELDS = {
        Department: true,
        ProdSupervisor: true,
        WorkCentre: true
    };

    /**
     * Shared List Report extension (FE V4 / MDC FilterBar).
     * Applies route query params as filter conditions (overwrite), then triggerSearch.
     */
    return ControllerExtension.extend('com.cathaydining.zppr004.ext.controller.ListReportExtension', {

        override: {
            onInit: function () {
                this._bApplyingFilters = false;
                this._sLastAppliedSignature = '';
                this._iApplyToken = 0;
                this._oPendingQuery = undefined;
                this._oScheduledQuery = null;

                // RouteMatched only — do not listen to hashChanged.
                // FE iAppState hash updates would re-trigger apply → triggerSearch → flash loop.
                var oRouter = this.base.getAppComponent().getRouter();
                this._fnRouteMatched = function (oEvent) {
                    var sRouteName = oEvent.getParameter('name');
                    var bOwnRoute = !!(sRouteName && this.base.getView().getId().indexOf(sRouteName) >= 0);
                    if (!bOwnRoute) {
                        // Left this List — next entry must re-apply drill filters (overwrite).
                        // While staying on List, user edits must not be forced back from hash.
                        this._sLastAppliedSignature = '';
                        return;
                    }
                    var oArgs = oEvent.getParameter('arguments') || {};
                    this._scheduleApply(oArgs['?query'] || null);
                }.bind(this);
                oRouter.attachRouteMatched(this._fnRouteMatched);

                // First open: routeMatched may have already fired before attach — apply from hash.
                this._scheduleApply(null);
            },

            onExit: function () {
                if (this._iScheduleTimer) {
                    clearTimeout(this._iScheduleTimer);
                    this._iScheduleTimer = null;
                }
                if (this._fnRouteMatched) {
                    this.base.getAppComponent().getRouter().detachRouteMatched(this._fnRouteMatched);
                    this._fnRouteMatched = null;
                }
                this._bApplyingFilters = false;
                this._sLastAppliedSignature = '';
                this._oPendingQuery = undefined;
                this._iApplyToken += 1;
            }
        },

        /**
         * Debounce burst of onInit + routeMatched (+ iAppState hash updates).
         * @param {object|null} oRouteQuery Route query
         * @private
         */
        _scheduleApply: function (oRouteQuery) {
            this._oScheduledQuery = oRouteQuery;
            if (this._iScheduleTimer) {
                clearTimeout(this._iScheduleTimer);
            }
            this._iScheduleTimer = setTimeout(function () {
                this._iScheduleTimer = null;
                var oQuery = this._oScheduledQuery;
                this._oScheduledQuery = null;
                this._applyQueryFilters(oQuery);
            }.bind(this), 50);
        },

        /**
         * @param {object} [oRouteQuery] Optional query from routeMatched
         * @returns {Promise}
         * @private
         */
        _applyQueryFilters: async function (oRouteQuery) {
            if (this._bApplyingFilters) {
                // Keep latest navigation; do not drop a re-drill that arrives mid-apply.
                this._oPendingQuery = oRouteQuery;
                return;
            }

            var oDesired = this._getBusinessQueryParams(oRouteQuery);
            if (!oDesired || !Object.keys(oDesired).length) {
                return;
            }

            var sSignature = this._buildSignature(oDesired);
            // Same navigation already applied → allow the user to change FilterBar freely.
            // Re-entry after leaving the List clears _sLastAppliedSignature and applies again.
            if (sSignature && sSignature === this._sLastAppliedSignature) {
                return;
            }

            var oFilterBar = await this._waitForFilterBar();
            if (!oFilterBar) {
                return;
            }

            var iToken = ++this._iApplyToken;
            this._bApplyingFilters = true;
            this._oPendingQuery = undefined;
            try {
                if (oFilterBar.initialized) {
                    await oFilterBar.initialized();
                }
                if (iToken !== this._iApplyToken) {
                    return;
                }

                await this._waitForFilterFields(oFilterBar, Object.keys(oDesired));
                if (iToken !== this._iApplyToken) {
                    return;
                }

                // ExtensionAPI clear+set is the reliable overwrite path; StateUtil is fallback.
                var bOk = await this._applyViaExtensionAPI(oDesired);
                if (!bOk) {
                    try {
                        await this._applyViaStateUtil(oFilterBar, oDesired);
                    } catch (oStateError) {
                        Log.warning('StateUtil filter apply failed',
                            oStateError, 'com.cathaydining.zppr004');
                        throw oStateError;
                    }
                }

                if (iToken !== this._iApplyToken) {
                    return;
                }

                var bApplied = await this._verifyApplied(oFilterBar, oDesired);
                if (!bApplied) {
                    await this._delay(200);
                    if (iToken !== this._iApplyToken) {
                        return;
                    }
                    if (!(await this._applyViaExtensionAPI(oDesired))) {
                        await this._applyViaStateUtil(oFilterBar, oDesired);
                    }
                    bApplied = await this._verifyApplied(oFilterBar, oDesired);
                }

                // Always remember this navigation signature to avoid hammering the same params,
                // even when verify is soft-failing (display text vs key mismatches).
                this._sLastAppliedSignature = sSignature;

                if (bApplied && oFilterBar.triggerSearch) {
                    oFilterBar.triggerSearch();
                } else if (!bApplied) {
                    Log.warning('Drill-down filters not fully applied: ' + sSignature,
                        null, 'com.cathaydining.zppr004');
                }
            } catch (oError) {
                this._sLastAppliedSignature = '';
                Log.error('Could not apply the drill-down filters to the filter bar',
                    oError, 'com.cathaydining.zppr004');
            } finally {
                this._bApplyingFilters = false;
                this._flushPendingIfNeeded(iToken);
            }
        },

        /**
         * Re-run only when pending navigation carries different business params.
         * @param {number} iToken Apply token
         * @private
         */
        _flushPendingIfNeeded: function (iToken) {
            if (this._oPendingQuery === undefined || iToken !== this._iApplyToken) {
                return;
            }
            var oPending = this._oPendingQuery;
            this._oPendingQuery = undefined;

            var oPendingDesired = this._getBusinessQueryParams(oPending);
            if (!oPendingDesired || !Object.keys(oPendingDesired).length) {
                return;
            }
            var sPendingSig = this._buildSignature(oPendingDesired);
            // Ignore duplicate routeMatched / iAppState noise that arrived during apply.
            if (sPendingSig && sPendingSig === this._sLastAppliedSignature) {
                return;
            }
            this._scheduleApply(oPending);
        },

        /**
         * Clear overwrite fields, then set desired values (true overwrite).
         * @param {object} oDesired Desired filters
         * @returns {Promise<boolean>}
         * @private
         */
        _applyViaExtensionAPI: async function (oDesired) {
            var oAPI = this.base.getExtensionAPI && this.base.getExtensionAPI();
            if (!oAPI || typeof oAPI.setFilterValues !== 'function') {
                return false;
            }

            for (var i = 0; i < OVERWRITE_FIELDS.length; i++) {
                await oAPI.setFilterValues(OVERWRITE_FIELDS[i]);
            }
            var aKeys = Object.keys(oDesired);
            for (var j = 0; j < aKeys.length; j++) {
                var sField = aKeys[j];
                var aValues = this._splitFilterValues(sField, oDesired[sField]);
                if (!aValues.length) {
                    continue;
                }
                await oAPI.setFilterValues(
                    sField,
                    this._operatorForField(sField),
                    aValues.length === 1 ? aValues[0] : aValues
                );
            }
            return true;
        },

        /**
         * Clear then set in two applyExternalState calls (overwrite, never append).
         * @param {sap.ui.mdc.FilterBar} oFilterBar Filter bar
         * @param {object} oDesired Desired filters
         * @returns {Promise}
         * @private
         */
        _applyViaStateUtil: async function (oFilterBar, oDesired) {
            var oCurrentState = await StateUtil.retrieveExternalState(oFilterBar);
            var oCurrent = (oCurrentState && oCurrentState.filter) || {};
            var oClear = {};
            var mTouch = {};

            OVERWRITE_FIELDS.forEach(function (sKey) {
                mTouch[sKey] = true;
            });
            Object.keys(oDesired).forEach(function (sKey) {
                mTouch[sKey] = true;
            });

            Object.keys(mTouch).forEach(function (sKey) {
                var aActive = (oCurrent[sKey] || []).filter(function (oCondition) {
                    return oCondition.filtered !== false;
                });
                if (!aActive.length) {
                    return;
                }
                oClear[sKey] = aActive.map(function (oCondition) {
                    return Object.assign({}, oCondition, { filtered: false });
                });
            });

            if (Object.keys(oClear).length) {
                await StateUtil.applyExternalState(oFilterBar, { filter: oClear });
            }

            var oSet = {};
            Object.keys(oDesired).forEach(function (sField) {
                var aValues = this._splitFilterValues(sField, oDesired[sField]);
                if (!aValues.length) {
                    return;
                }
                oSet[sField] = aValues.map(function (sValue) {
                    return this._createCondition(sField, sValue);
                }.bind(this));
            }.bind(this));

            if (Object.keys(oSet).length) {
                await StateUtil.applyExternalState(oFilterBar, { filter: oSet });
            }
        },

        /**
         * Desired values must match exactly; overwrite fields not in the query must be empty.
         * @param {sap.ui.mdc.FilterBar} oFilterBar Filter bar
         * @param {object} oDesired Desired filters
         * @returns {Promise<boolean>}
         * @private
         */
        _verifyApplied: async function (oFilterBar, oDesired) {
            var oState = await StateUtil.retrieveExternalState(oFilterBar);
            var oFilter = (oState && oState.filter) || {};

            var bDesiredOk = Object.keys(oDesired).every(function (sField) {
                var aWanted = this._splitFilterValues(sField, oDesired[sField]).slice().sort();
                var aGot = this._activeConditionValues(oFilter[sField]).slice().sort();
                if (aWanted.length !== aGot.length) {
                    return false;
                }
                return aWanted.every(function (sWanted, iIdx) {
                    return aGot[iIdx] === sWanted;
                });
            }.bind(this));

            if (!bDesiredOk) {
                return false;
            }

            return OVERWRITE_FIELDS.every(function (sField) {
                if (Object.prototype.hasOwnProperty.call(oDesired, sField)) {
                    return true;
                }
                return this._activeConditionValues(oFilter[sField]).length === 0;
            }.bind(this));
        },

        /**
         * @param {object[]} aConditions Conditions
         * @returns {string[]}
         * @private
         */
        _activeConditionValues: function (aConditions) {
            var aValues = [];
            (aConditions || []).forEach(function (oCondition) {
                if (oCondition.filtered === false) {
                    return;
                }
                (oCondition.values || []).forEach(function (vValue) {
                    if (vValue !== undefined && vValue !== null && vValue !== '') {
                        aValues.push(String(vValue));
                    }
                });
            });
            return aValues;
        },

        /**
         * @param {sap.ui.mdc.FilterBar} oFilterBar Filter bar
         * @param {string[]} aFields Field names
         * @returns {Promise}
         * @private
         */
        _waitForFilterFields: async function (oFilterBar, aFields) {
            if (!aFields || !aFields.length) {
                return;
            }
            for (var i = 0; i < 30; i++) {
                if (this._hasFilterFields(oFilterBar, aFields)) {
                    return;
                }
                await this._delay(100);
            }
        },

        /**
         * @param {sap.ui.mdc.FilterBar} oFilterBar Filter bar
         * @param {string[]} aFields Field names
         * @returns {boolean}
         * @private
         */
        _hasFilterFields: function (oFilterBar, aFields) {
            var aNames = [];
            try {
                var aPropertyInfo = [];
                if (typeof oFilterBar.getPropertyInfoSet === 'function') {
                    aPropertyInfo = oFilterBar.getPropertyInfoSet() || [];
                } else if (typeof oFilterBar.getPropertyInfo === 'function') {
                    aPropertyInfo = oFilterBar.getPropertyInfo() || [];
                }
                aNames = aPropertyInfo.map(function (oInfo) {
                    return oInfo.name || oInfo.key || oInfo.path;
                }).filter(Boolean);
            } catch (oError) {
                aNames = [];
            }

            if (!aNames.length) {
                return true;
            }
            return aFields.every(function (sField) {
                return aNames.indexOf(sField) >= 0;
            });
        },

        /**
         * @param {number} iMs Delay
         * @returns {Promise}
         * @private
         */
        _delay: function (iMs) {
            return new Promise(function (fnResolve) {
                setTimeout(fnResolve, iMs);
            });
        },

        /**
         * Split semicolon-separated drill values for multi filter fields.
         * @param {string} sField Field name
         * @param {string} sValue Raw value
         * @returns {string[]}
         * @private
         */
        _splitFilterValues: function (sField, sValue) {
            if (sValue === undefined || sValue === null || sValue === '') {
                return [];
            }
            if (!MULTI_VALUE_FIELDS[sField]) {
                return [String(sValue)];
            }
            return String(sValue)
                .split(/[;,]/)
                .map(function (sPart) {
                    return sPart.trim();
                })
                .filter(Boolean);
        },

        /**
         * @param {string} sField Filter field
         * @returns {string} Operator
         * @private
         */
        _operatorForField: function (sField) {
            if (sField === 'ProdStartTime') {
                return 'GE';
            }
            if (sField === 'ProdEndTime') {
                return 'LE';
            }
            return 'EQ';
        },

        /**
         * NotValidated avoids drop when value help is not ready.
         * @param {string} sField Filter field
         * @param {string} sValue Value
         * @returns {object} Condition
         * @private
         */
        _createCondition: function (sField, sValue) {
            var sOperator = this._operatorForField(sField);
            if (Condition && typeof Condition.createCondition === 'function') {
                return Condition.createCondition(sOperator, [sValue], undefined, undefined, 'NotValidated');
            }
            return {
                operator: sOperator,
                values: [sValue],
                validated: 'NotValidated'
            };
        },

        /**
         * Hash is source of truth for HashChanger navigation; route args overlay.
         * @param {object} [oRouteQuery] Route query
         * @returns {object|null}
         * @private
         */
        _getBusinessQueryParams: function (oRouteQuery) {
            var oDesired = {};
            var oHash = this._getQueryParamsFromHash() || {};
            var oSource = Object.assign({}, oHash, (oRouteQuery && typeof oRouteQuery === 'object') ? oRouteQuery : {});

            if (!Object.keys(oSource).length) {
                return null;
            }

            var mAllowed = {
                Plant: true,
                KeyDate: true,
                Department: true,
                ProdSupervisor: true,
                WorkCentre: true,
                ProdStartTime: true,
                ProdEndTime: true,
                OrderType: true,
                Material: true,
                ProdEndDate: true
            };

            Object.keys(oSource).forEach(function (sKey) {
                var sValue = oSource[sKey];
                if (!sValue || sKey === 'sap-iapp-state' || sKey.indexOf('sap-') === 0) {
                    return;
                }
                if (!mAllowed[sKey]) {
                    return;
                }
                if (sKey === 'ProdStartTime' || sKey === 'ProdEndTime') {
                    sValue = this._toEdmTime(sValue);
                    if (!sValue) {
                        return;
                    }
                }
                oDesired[sKey] = sValue;
            }.bind(this));
            return Object.keys(oDesired).length ? oDesired : null;
        },

        /**
         * @param {string} sValue Time
         * @returns {string}
         * @private
         */
        _toEdmTime: function (sValue) {
            if (!sValue) {
                return '';
            }
            var aParts = String(sValue).split(':');
            if (aParts.length < 2) {
                return '';
            }
            return String(aParts[0]).padStart(2, '0')
                + ':' + String(aParts[1]).padStart(2, '0')
                + ':' + String(aParts[2] || '00').padStart(2, '0');
        },

        /**
         * @param {object} oDesired Filters
         * @returns {string}
         * @private
         */
        _buildSignature: function (oDesired) {
            return Object.keys(oDesired).sort().map(function (sKey) {
                return sKey + '=' + oDesired[sKey];
            }).join('&');
        },

        /**
         * @returns {Promise<sap.ui.mdc.FilterBar|null>}
         * @private
         */
        _waitForFilterBar: async function () {
            for (var i = 0; i < 100; i++) {
                var oFilterBar = this._getFilterBar();
                if (oFilterBar) {
                    return oFilterBar;
                }
                await this._delay(100);
            }
            return null;
        },

        /**
         * @returns {object|null}
         * @private
         */
        _getQueryParamsFromHash: function () {
            var sHash = (window.location.hash || '').replace(/^#\/?/, '');
            var iIndex = sHash.indexOf('?');
            if (iIndex < 0) {
                return null;
            }
            var oParams = new URLSearchParams(sHash.substring(iIndex + 1));
            var oResult = {};
            oParams.forEach(function (sValue, sKey) {
                oResult[sKey] = sValue;
            });
            return Object.keys(oResult).length ? oResult : null;
        },

        /**
         * @returns {sap.ui.mdc.FilterBar|null}
         * @private
         */
        _getFilterBar: function () {
            var aFilterBars = this.base.getView().findAggregatedObjects(true, function (oControl) {
                return oControl.isA('sap.ui.mdc.FilterBar');
            });
            return aFilterBars.length ? aFilterBars[0] : null;
        }
    });
});
