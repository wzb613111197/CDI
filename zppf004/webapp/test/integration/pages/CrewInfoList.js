sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppf004',
            componentId: 'CrewInfoList',
            contextPath: '/CrewInfo'
        },
        CustomPageDefinitions
    );
});