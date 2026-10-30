sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe024',
            componentId: 'ZC_PP_LDGDEF_HDRList',
            contextPath: '/ZC_PP_LDGDEF_HDR'
        },
        CustomPageDefinitions
    );
});