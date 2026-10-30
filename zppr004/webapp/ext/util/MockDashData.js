sap.ui.define([], function () {
    'use strict';

    /**
     * Temporary mock payloads for CardLevel D → S → W.
     * Shape matches the service contract:
     * { ProductionItem: [ { CardLevel, CardItem: [] } ], PlantItem: [ { CardItem: [] } ] }
     */

    var MOCK_D = {
        ProductionItem: [{
            CardLevel: 'D',
            CardItem: [
                {
                    SubTitle: 'Tray',
                    Plant: 'CDI0',
                    Department: 'Tray',
                    ProdSupervisor: 'D',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.98,
                    ProductivityIndicator: 0.95,
                    SchIndicatorColor: 'G',
                    ProdIndicatorColor: 'G'
                },
                {
                    SubTitle: 'Dish Out',
                    Plant: 'CDI0',
                    Department: 'Dish Out',
                    ProdSupervisor: 'D',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.85,
                    ProductivityIndicator: 0.91,
                    SchIndicatorColor: 'Y',
                    ProdIndicatorColor: 'G'
                }
            ]
        }],
        PlantItem: [{
            CardItem: [
                {
                    Title: 'CDI0',
                    Plant: 'CDI0',
                    KeyDate: '20260916',
                    NumberOfFights: 234,
                    NumberOfFightsclosed: 230
                }
            ]
        }]
    };

    var MOCK_S = {
        ProductionItem: [{
            CardLevel: 'S',
            CardItem: [
                {
                    SubTitle: 'MD1',
                    Plant: 'CDI0',
                    Department: 'Tray',
                    ProdSupervisor: 'MD1',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.97,
                    ProductivityIndicator: 0.94
                },
                {
                    SubTitle: 'FP1',
                    Plant: 'CDI0',
                    Department: 'Tray',
                    ProdSupervisor: 'FP1',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.90,
                    ProductivityIndicator: 0.89
                }
            ]
        }],
        PlantItem: [{
            CardItem: [
                {
                    Title: 'CDI0',
                    Plant: 'CDI0',
                    KeyDate: '20260916',
                    NumberOfFights: 180,
                    NumberOfFightsclosed: 175
                }
            ]
        }]
    };

    var MOCK_W = {
        ProductionItem: [{
            CardLevel: 'W',
            CardItem: [
                {
                    SubTitle: 'BUTMEA01',
                    Plant: 'CDI0',
                    Department: 'Tray',
                    ProdSupervisor: 'MD1',
                    WorkCentre: 'BUTMEA01',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.96,
                    ProductivityIndicator: 0.93,
                    HACCPFulfilment: 1
                },
                {
                    SubTitle: 'BUTMEA02',
                    Plant: 'CDI0',
                    Department: 'Tray',
                    ProdSupervisor: 'MD1',
                    WorkCentre: 'BUTMEA02',
                    KeyDate: '20260916',
                    ScheduleAdherence: 0.88,
                    ProductivityIndicator: 0.91,
                    HACCPFulfilment: 0.99
                }
            ]
        }],
        PlantItem: [{
            CardItem: [
                {
                    Title: 'CDI0',
                    Plant: 'CDI0',
                    KeyDate: '20260916',
                    NumberOfFights: 120,
                    NumberOfFightsclosed: 118
                }
            ]
        }]
    };

    function _hasValue(v) {
        return v !== undefined && v !== null && String(v).trim() !== '';
    }

    return {
        /**
         * @param {object} oSelection Selection / drill criteria
         * @returns {{ProductionItem: object[], PlantItem: object[]}}
         */
        getResponse: function (oSelection) {
            oSelection = oSelection || {};
            if (_hasValue(oSelection.WorkCentre)) {
                return MOCK_W;
            }
            if (_hasValue(oSelection.ProdSupervisor) || _hasValue(oSelection.Supervisor)) {
                return MOCK_S;
            }
            if (_hasValue(oSelection.Department)) {
                var oS = JSON.parse(JSON.stringify(MOCK_S));
                (oS.ProductionItem[0].CardItem || []).forEach(function (oItem) {
                    oItem.Department = oSelection.Department;
                });
                return oS;
            }
            return MOCK_D;
        }
    };
});
