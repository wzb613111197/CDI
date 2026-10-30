sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zsdr005',
            componentId: 'ZC_SD_STANDARD_BILLING_REPORTList',
            contextPath: '/ZC_SD_STANDARD_BILLING_REPORT'
        },
        CustomPageDefinitions
    );
});