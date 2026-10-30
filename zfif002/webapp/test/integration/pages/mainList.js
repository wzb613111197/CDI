sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zfif002',
            componentId: 'mainList',
            contextPath: '/main'
        },
        CustomPageDefinitions
    );
});