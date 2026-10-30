sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe024.catsecdet',
            componentId: 'ZC_PP_CAT_SEC_DETList',
            contextPath: '/ZC_PP_CAT_SEC_DET'
        },
        CustomPageDefinitions
    );
});