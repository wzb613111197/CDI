sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe025.ovrflowmeltype',
            componentId: 'ZC_PP_OVRFLOW_MELTYPList',
            contextPath: '/ZC_PP_OVRFLOW_MELTYP'
        },
        CustomPageDefinitions
    );
});