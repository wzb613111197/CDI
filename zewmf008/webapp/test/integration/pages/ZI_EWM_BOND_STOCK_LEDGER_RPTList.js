sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmf008.zewmf008',
            componentId: 'ZI_EWM_BOND_STOCK_LEDGER_RPTList',
            contextPath: '/ZI_EWM_BOND_STOCK_LEDGER_RPT'
        },
        CustomPageDefinitions
    );
});