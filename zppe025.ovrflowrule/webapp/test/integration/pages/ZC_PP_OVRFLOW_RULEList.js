sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe025.ovrflowrule',
            componentId: 'ZC_PP_OVRFLOW_RULEList',
            contextPath: '/ZC_PP_OVRFLOW_RULE'
        },
        CustomPageDefinitions
    );
});