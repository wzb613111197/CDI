sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/MessageType"
], (Controller, JSONModel, Filter, FilterOperator, Sorter, MessageType) => {
    "use strict";

    const DEFAULT_PAGE_SIZE = 16;
    const DEFAULT_PAGE_INTERVAL = 15000;
    const TRANSITION_CLASS = "boardTableTransition";
    const TRACKED_FIELDS = ["AircraftType", "TailNumber", "ParkingBay", "ETATime", "ETDTime", "Destination", "OpsStatus", "Remark"];

    return Controller.extend("com.cathaydining.zppr005.departureflt.controller.View2", {
        onInit() {
            this._aFlights = [];
            this._iCurrentPage = 0;
            this._sAirlineGrp = "";
            this._iPageSize = DEFAULT_PAGE_SIZE;
            this._iPageInterval = DEFAULT_PAGE_INTERVAL;
            this._oPreviousDataMap = {};
            this._oChangeCounts = {};
            this._bFirstLoad = true;
            this._oBoardModel = new JSONModel({
                airlineGrp: "",
                dateText: "",
                timeText: "",
                pageText: "1/1",
                pagedFlights: []
            });
            this.getView().setModel(this._oBoardModel, "board");
            this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this._onRouteMatched, this);
            this._updateDateTime();
            this._iClockTimer = setInterval(this._updateDateTime.bind(this), 1000);
            this._startBoardTimers();
        },

        onExit() {
            clearInterval(this._iClockTimer);
            clearInterval(this._iBoardCycleTimer);
            clearTimeout(this._iTransitionTimer);
        },

        _onRouteMatched(oEvent) {
            const oArguments = oEvent.getParameter("arguments") || {};
            const oQuery = oArguments["?query"] || {};

            this._sAirlineGrp = oQuery.AirlineGrp || "";
            this._iPageSize = this._normalizePositiveInteger(oQuery.PageSize, DEFAULT_PAGE_SIZE);
            this._iPageInterval = this._normalizePositiveInteger(oQuery.PageInterval, DEFAULT_PAGE_INTERVAL / 1000) * 1000;
            this._oBoardModel.setProperty("/airlineGrp", this._sAirlineGrp);
            this._iCurrentPage = 0;
            this._oPreviousDataMap = {};
            this._oChangeCounts = {};
            this._bFirstLoad = true;
            this._startBoardTimers();
            this._loadFlights();
        },

        _startBoardTimers() {
            clearInterval(this._iBoardCycleTimer);

            this._iBoardCycleTimer = setInterval(this._advanceBoardCycle.bind(this), this._iPageInterval);
        },

        _loadFlights() {
            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel();
            const aFilters = [];
            const oNow = new Date();
            const oFromTime = new Date(oNow.getTime() - (4 * 60 * 60 * 1000));
            const oToTime = new Date(oNow.getTime() + (4 * 60 * 60 * 1000));

            if (!oModel) {
                this._aFlights = [];
                this._iCurrentPage = 0;
                this._updatePagedFlights();
                return;
            }

            aFilters.push(new Filter("ETDTimestamp", FilterOperator.BT, this._toDecimalTimestamp(oFromTime), this._toDecimalTimestamp(oToTime)));

            if (this._sAirlineGrp) {
                aFilters.push(new Filter("AirlineGrp", FilterOperator.EQ, this._sAirlineGrp));
            }

            const oListBinding = oModel.bindList(
                "/ZC_PP_DEPARTURE_FLT",
                undefined,
                [new Sorter("ETDTimestamp", false)],
                aFilters
            );

            oListBinding.requestContexts(0, 500).then((aContexts) => {
                const aNewFlights = aContexts.map((oContext) => {
                    const oObject = Object.assign({}, oContext.getObject());
                    oObject._etdTimestamp = this._normalizeTimestamp(oObject.ETDTimestamp);
                    return oObject;
                });

                this._compareAndUpdateChangeCounts(aNewFlights);
                this._aFlights = aNewFlights;

                if (this._iCurrentPage >= this._getPageCount()) {
                    this._iCurrentPage = 0;
                }

                this._updatePagedFlights();
            }).catch(() => {
                this._aFlights = [];
                this._iCurrentPage = 0;
                this._updatePagedFlights();
            });
        },

        _advanceBoardCycle() {
            const iPageCount = this._getPageCount();

            if (iPageCount <= 1) {
                this._iCurrentPage = 0;
                this._playBoardTransition();
                this._loadFlights();
                return;
            }

            if (this._iCurrentPage < iPageCount - 1) {
                this._iCurrentPage += 1;
                this._playBoardTransition();
                this._updatePagedFlights();
                return;
            }

            this._iCurrentPage = 0;
            this._playBoardTransition();
            this._loadFlights();
        },

        _getPageCount() {
            return Math.max(1, Math.ceil(this._aFlights.length / this._iPageSize));
        },

        _updatePagedFlights() {
            const iPageCount = this._getPageCount();
            const iStart = this._iCurrentPage * this._iPageSize;
            const aPageData = this._aFlights.slice(iStart, iStart + this._iPageSize);

            this._oBoardModel.setProperty("/pagedFlights", aPageData);
            this._oBoardModel.setProperty("/pageText", (iPageCount === 0 ? 0 : this._iCurrentPage + 1) + "/" + iPageCount);
        },

        _normalizePositiveInteger(vValue, iDefaultValue) {
            const iValue = parseInt(vValue, 10);

            if (!Number.isFinite(iValue) || iValue <= 0) {
                return iDefaultValue;
            }

            return iValue;
        },

        _playBoardTransition() {
            const oTable = this.byId("departureBoardTable");

            if (!oTable) {
                return;
            }

            clearTimeout(this._iTransitionTimer);
            oTable.removeStyleClass(TRANSITION_CLASS);
            oTable.addStyleClass(TRANSITION_CLASS);
            this._iTransitionTimer = setTimeout(() => {
                oTable.removeStyleClass(TRANSITION_CLASS);
            }, 700);
        },

        _updateDateTime() {
            const oNow = new Date();
            const oI18nModel = this.getOwnerComponent().getModel("i18n") || this.getView().getModel("i18n");
            const oResourceBundle = oI18nModel ? oI18nModel.getResourceBundle() : null;
            const sLocale = sap.ui.getCore().getConfiguration().getLanguageTag() || "en";
            const sDate = new Intl.DateTimeFormat(sLocale, {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long"
            }).format(oNow);
            const sCurrentTimePrefix = oResourceBundle ? oResourceBundle.getText("currentTimePrefix") : "Now";
            const sTime = sCurrentTimePrefix + " " + new Intl.DateTimeFormat(sLocale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
            }).format(oNow);

            this._oBoardModel.setProperty("/dateText", sDate);
            this._oBoardModel.setProperty("/timeText", sTime);
        },


        formatFlightNumber(sValue) {
            if (!sValue) {
                return "";
            }
            return String(sValue).replace(/^([A-Za-z]+)0/, "$1");
        },

        formatTimeHHMM(sTime) {
            if (!sTime) {
                return "";
            }
            const aParts = String(sTime).split(":");
            return aParts.length >= 2 ? aParts[0] + ":" + aParts[1] : sTime;
        },

        formatETDTime(sETDTime, sSTDRaw, sOpsStatus) {
            if (!sETDTime) {
                return "";
            }
            const aParts = String(sETDTime).split(":");
            const sFormatted = aParts.length >= 2 ? aParts[0] + ":" + aParts[1] : sETDTime;
            if (sOpsStatus === "DLY" && sSTDRaw && String(sETDTime) !== String(sSTDRaw)) {
                return "D" + sFormatted;
            }
            return sFormatted;
        },

        _compareAndUpdateChangeCounts(aNewFlights) {
            if (this._bFirstLoad) {
                this._bFirstLoad = false;
                const oNewMap = {};
                aNewFlights.forEach((oFlight) => {
                    const sKey = oFlight.FlightNumber;
                    oNewMap[sKey] = oFlight;
                    if (!this._oChangeCounts[sKey]) {
                        this._oChangeCounts[sKey] = {};
                    }
                    TRACKED_FIELDS.forEach((sField) => {
                        if (!this._oChangeCounts[sKey][sField]) {
                            this._oChangeCounts[sKey][sField] = 0;
                        }
                        oFlight["_change_" + sField] = 0;
                    });
                });
                this._oPreviousDataMap = oNewMap;
                return;
            }

            const oNewMap = {};
            aNewFlights.forEach((oFlight) => {
                const sKey = oFlight.FlightNumber;
                oNewMap[sKey] = oFlight;
                const oPrev = this._oPreviousDataMap[sKey];

                if (!this._oChangeCounts[sKey]) {
                    this._oChangeCounts[sKey] = {};
                }

                TRACKED_FIELDS.forEach((sField) => {
                    if (!this._oChangeCounts[sKey][sField]) {
                        this._oChangeCounts[sKey][sField] = 0;
                    }
                    if (oPrev && this._isFieldChangedBeyondThreshold(oFlight, oPrev, sField)) {
                        this._oChangeCounts[sKey][sField] += 1;
                    }
                    oFlight["_change_" + sField] = this._oChangeCounts[sKey][sField];
                });
            });
            this._oPreviousDataMap = oNewMap;
        },

        _isFieldChangedBeyondThreshold(oFlight, oPrev, sField) {
            const sNewValue = String(oFlight[sField] || "");
            const sOldValue = String(oPrev[sField] || "");

            if (sField === "ETATime" || sField === "ETDTime") {
                return this._timeDifferenceMinutes(sNewValue, sOldValue) > 10;
            }

            return sNewValue !== sOldValue;
        },

        _timeDifferenceMinutes(sTime1, sTime2) {
            if (!sTime1 || !sTime2) {
                return sTime1 === sTime2 ? 0 : Number.POSITIVE_INFINITY;
            }
            const iMinutes1 = this._parseTimeToMinutes(sTime1);
            const iMinutes2 = this._parseTimeToMinutes(sTime2);
            if (iMinutes1 === null || iMinutes2 === null) {
                return sTime1 === sTime2 ? 0 : Number.POSITIVE_INFINITY;
            }
            return Math.abs(iMinutes1 - iMinutes2);
        },

        _parseTimeToMinutes(sTime) {
            const aParts = String(sTime).split(":");
            if (aParts.length < 2) {
                return null;
            }
            const iHours = parseInt(aParts[0], 10);
            const iMinutes = parseInt(aParts[1], 10);
            if (Number.isNaN(iHours) || Number.isNaN(iMinutes)) {
                return null;
            }
            return iHours * 60 + iMinutes;
        },

        formatCellState(iChangeCount) {
            const iValue = Number(iChangeCount);

            if (iValue === 1) {
                return "Success";
            }

            if (iValue === 2) {
                return "Warning";
            }

            if (iValue >= 3) {
                return "Error";
            }

            return "None";
        },

        formatStatusState(iChangeCount) {
            return this.formatCellState(iChangeCount);
        },

        _toDecimalTimestamp(oDate) {
            const y = oDate.getFullYear();
            const m = String(oDate.getMonth() + 1).padStart(2, "0");
            const d = String(oDate.getDate()).padStart(2, "0");
            const h = String(oDate.getHours()).padStart(2, "0");
            const min = String(oDate.getMinutes()).padStart(2, "0");
            const s = String(oDate.getSeconds()).padStart(2, "0");
            return y + m + d + h + min + s;
        },

        _normalizeTimestamp(vTimestamp) {
            if (!vTimestamp) {
                return null;
            }

            if (typeof vTimestamp === "number") {
                return vTimestamp;
            }

            if (vTimestamp instanceof Date) {
                return vTimestamp.getTime();
            }

            if (typeof vTimestamp === "string") {
                const iParsedTimestamp = Date.parse(vTimestamp);

                if (!Number.isNaN(iParsedTimestamp)) {
                    return iParsedTimestamp;
                }

                if (/^\d+$/.test(vTimestamp)) {
                    return Number(vTimestamp);
                }
            }

            if (typeof vTimestamp === "object") {
                if (typeof vTimestamp.ms === "number") {
                    return vTimestamp.ms;
                }

                if (typeof vTimestamp.value === "string") {
                    return this._normalizeTimestamp(vTimestamp.value);
                }
            }

            return null;
        }
    });
});
