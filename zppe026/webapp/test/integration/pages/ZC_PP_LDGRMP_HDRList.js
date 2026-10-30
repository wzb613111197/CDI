sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe026',
            componentId: 'ZC_PP_LDGRMP_HDRList',
            contextPath: '/ZC_PP_LDGRMP_HDR'
        },
        CustomPageDefinitions
    );
});