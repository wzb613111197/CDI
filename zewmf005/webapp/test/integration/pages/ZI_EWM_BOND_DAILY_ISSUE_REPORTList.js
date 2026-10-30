sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zewmf005',
            componentId: 'ZI_EWM_BOND_DAILY_ISSUE_REPORTList',
            contextPath: '/ZI_EWM_BOND_DAILY_ISSUE_REPORT'
        },
        CustomPageDefinitions
    );
});