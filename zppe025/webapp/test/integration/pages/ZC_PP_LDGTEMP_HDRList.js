sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe025',
            componentId: 'ZC_PP_LDGTEMP_HDRList',
            contextPath: '/ZC_PP_LDGTEMP_HDR'
        },
        CustomPageDefinitions
    );
});