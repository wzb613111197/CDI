sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zmme004',
            componentId: 'ZC_MM_REBOUNDList',
            contextPath: '/ZC_MM_REBOUND'
        },
        CustomPageDefinitions
    );
});