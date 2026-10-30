sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], (Controller, JSONModel, Filter, FilterOperator, Sorter) => {
    "use strict";

    const DEFAULT_PAGE_SIZE = 16;
    const DEFAULT_PAGE_INTERVAL = 15000;
    const TRANSITION_CLASS = "boardTableTransition";

    return Controller.extend("com.cathaydining.zppr005.cartarrival.controller.View2", {
        onInit() {
            this._aItems = [];
            this._iCurrentPage = 0;
            this._aColdRooms = [];
            this._iPageSize = DEFAULT_PAGE_SIZE;
            this._iPageInterval = DEFAULT_PAGE_INTERVAL;
            this._oBoardModel = new JSONModel({
                coldRoomText: "",
                dateText: "",
                timeText: "",
                pageText: "1/1",
                pagedItems: [],
                pageDemandTotal: 0,
                pageOsTotal: 0
            });
            this.getView().setModel(this._oBoardModel, "board");
            this.getOwnerComponent().getRouter().getRoute("RouteView2").attachPatternMatched(this._onRouteMatched, this);
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
            const sColdRoom = oQuery.ColdRoom || "";

            this._aColdRooms = sColdRoom ? sColdRoom.split(",") : [];
            this._iPageSize = this._normalizePositiveInteger(oQuery.PageSize, DEFAULT_PAGE_SIZE);
            this._iPageInterval = this._normalizePositiveInteger(oQuery.PageInterval, DEFAULT_PAGE_INTERVAL / 1000) * 1000;
            this._oBoardModel.setProperty("/coldRoomText", this._aColdRooms.join(", "));
            this._iCurrentPage = 0;
            this._startBoardTimers();
            this._loadItems();
        },

        _startBoardTimers() {
            clearInterval(this._iBoardCycleTimer);
            this._iBoardCycleTimer = setInterval(this._advanceBoardCycle.bind(this), this._iPageInterval);
        },

        _loadItems() {
            const oModel = this.getOwnerComponent().getModel() || this.getView().getModel();
            const aFilters = [];
            const oNow = new Date();
            const oMinus6h = new Date(oNow.getTime() + (6 * 60 * 60 * 1000));
            const oMinus4h = new Date(oNow.getTime() + (4 * 60 * 60 * 1000));

            if (!oModel) {
                this._aItems = [];
                this._iCurrentPage = 0;
                this._updatePagedItems();
                return;
            }

            // Part 1: -6h to -4h with zmeal_relate = "X"
            const oPart1 = new Filter({
                filters: [
                    new Filter("ETDStamp", FilterOperator.BT, this._toDecimalTimestamp(oMinus4h), this._toDecimalTimestamp(oMinus6h)),
                    new Filter("MealRalate", FilterOperator.EQ, true)
                ],
                and: true
            });
            // Part 2: -4h to now with zmeal_relate = ""
            const oPart2 = new Filter({
                filters: [
                    new Filter("ETDStamp", FilterOperator.BT, this._toDecimalTimestamp(oNow), this._toDecimalTimestamp(oMinus4h))
                ],
                and: true
            });
            // Union of both parts
            aFilters.push(new Filter({
                filters: [oPart1, oPart2],
                and: false
            }));

            if (this._aColdRooms.length === 1) {
                aFilters.push(new Filter("ColdRoom", FilterOperator.EQ, this._aColdRooms[0]));
            } else if (this._aColdRooms.length > 1) {
                aFilters.push(new Filter({
                    filters: this._aColdRooms.map((sRoom) => new Filter("ColdRoom", FilterOperator.EQ, sRoom)),
                    and: false
                }));
            }

            const oListBinding = oModel.bindList(
                "/ZC_PP_CART_ARRIVAL",
                undefined,
                [new Sorter("ETDStamp", false)],
                aFilters
            );

            oListBinding.requestContexts(0, 500).then((aContexts) => {
                const aNewItems = aContexts.map((oContext) => Object.assign({}, oContext.getObject()));

                this._applyGrouping(aNewItems);
                this._aItems = aNewItems;

                if (this._iCurrentPage >= this._getPageCount()) {
                    this._iCurrentPage = 0;
                }

                this._updatePagedItems();
            }).catch(() => {
                this._aItems = [];
                this._iCurrentPage = 0;
                this._updatePagedItems();
            });
        },

        _advanceBoardCycle() {
            const iPageCount = this._getPageCount();

            if (iPageCount <= 1) {
                this._iCurrentPage = 0;
                this._playBoardTransition();
                this._loadItems();
                return;
            }

            if (this._iCurrentPage < iPageCount - 1) {
                this._iCurrentPage += 1;
                this._playBoardTransition();
                this._updatePagedItems();
                return;
            }

            this._iCurrentPage = 0;
            this._playBoardTransition();
            this._loadItems();
        },

        _getPageCount() {
            return Math.max(1, Math.ceil(this._aItems.length / this._iPageSize));
        },

        _updatePagedItems() {
            const iPageCount = this._getPageCount();
            const iStart = this._iCurrentPage * this._iPageSize;
            const aPageData = this._aItems.slice(iStart, iStart + this._iPageSize);

            const iDemandTotal = aPageData.reduce((iSum, oItem) => iSum + (Number(oItem.DemandQty) || 0), 0);
            const iOsTotal = aPageData.reduce((iSum, oItem) => iSum + (Number(oItem.OsQty) || 0), 0);

            this._oBoardModel.setProperty("/pagedItems", aPageData);
            this._oBoardModel.setProperty("/pageText", (iPageCount === 0 ? 0 : this._iCurrentPage + 1) + "/" + iPageCount);
            this._oBoardModel.setProperty("/pageDemandTotal", iDemandTotal);
            this._oBoardModel.setProperty("/pageOsTotal", iOsTotal);
        },

        _normalizePositiveInteger(vValue, iDefaultValue) {
            const iValue = parseInt(vValue, 10);

            if (!Number.isFinite(iValue) || iValue <= 0) {
                return iDefaultValue;
            }

            return iValue;
        },

        _playBoardTransition() {
            const oTable = this.byId("cartArrivalTable");

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

        _toDecimalTimestamp(oDate) {
            const y = oDate.getFullYear();
            const m = String(oDate.getMonth() + 1).padStart(2, "0");
            const d = String(oDate.getDate()).padStart(2, "0");
            const h = String(oDate.getHours()).padStart(2, "0");
            const min = String(oDate.getMinutes()).padStart(2, "0");
            const s = String(oDate.getSeconds()).padStart(2, "0");
            return y + m + d + h + min + s;
        },

        formatFlightNumber(sValue) {
            if (!sValue) {
                return "";
            }
            return String(sValue).replace(/^([A-Za-z]+)0/, "$1");
        },

        formatTime(sTime) {
            if (!sTime) {
                return "";
            }

            return String(sTime).substring(0, 5);
        },

        _applyGrouping(aItems) {
            let sPrevGroup = "";
            aItems.forEach((oItem) => {
                const sGroup = (oItem.Target || "") + "|" + (oItem.FlightNumber || "");
                if (sGroup !== sPrevGroup) {
                    oItem._groupFirst = true;
                    sPrevGroup = sGroup;
                } else {
                    oItem._groupFirst = false;
                }
            });
        },

        formatGroupTime(sValue, bGroupFirst) {
            if (!bGroupFirst) {
                return "";
            }
            if (!sValue) {
                return "";
            }
            return String(sValue).substring(0, 5);
        },

        formatGroupFlight(sValue, bGroupFirst) {
            if (!bGroupFirst) {
                return "";
            }
            if (!sValue) {
                return "";
            }
            return String(sValue).replace(/^([A-Za-z]+)0/, "$1");
        }
    });
});
