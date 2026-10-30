sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe020',
            componentId: 'ZC_PP_CN_HDRList',
            contextPath: '/ZC_PP_CN_HDR'
        },
        CustomPageDefinitions
    );
});