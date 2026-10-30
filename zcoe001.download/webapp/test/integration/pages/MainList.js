sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zcoe001.download',
            componentId: 'MainList',
            contextPath: '/Main'
        },
        CustomPageDefinitions
    );
});