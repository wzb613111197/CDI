sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zmme015.gilog',
            componentId: 'LogList',
            contextPath: '/Log'
        },
        CustomPageDefinitions
    );
});