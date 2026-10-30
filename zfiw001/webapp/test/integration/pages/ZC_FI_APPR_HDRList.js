sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zfiw001',
            componentId: 'ZC_FI_APPR_HDRList',
            contextPath: '/ZC_FI_APPR_HDR'
        },
        CustomPageDefinitions
    );
});