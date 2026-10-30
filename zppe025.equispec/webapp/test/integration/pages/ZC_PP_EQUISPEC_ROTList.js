sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppe025.equispec',
            componentId: 'ZC_PP_EQUISPEC_ROTList',
            contextPath: '/ZC_PP_EQUISPEC_ROT'
        },
        CustomPageDefinitions
    );
});