sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmf006',
            componentId: 'ZI_EWM_BOND_DAILY_CLOSING_RPTList',
            contextPath: '/ZI_EWM_BOND_DAILY_CLOSING_RPT'
        },
        CustomPageDefinitions
    );
});