sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zfii014',
            componentId: 'MainList',
            contextPath: '/Main'
        },
        CustomPageDefinitions
    );
});