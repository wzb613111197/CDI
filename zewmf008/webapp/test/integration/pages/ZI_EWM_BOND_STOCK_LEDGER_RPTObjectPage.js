sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewmf008.zewmf008',
            componentId: 'ZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage',
            contextPath: '/ZI_EWM_BOND_STOCK_LEDGER_RPT'
        },
        CustomPageDefinitions
    );
});