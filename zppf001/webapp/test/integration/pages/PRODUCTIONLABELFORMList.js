sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppf001',
            componentId: 'PRODUCTIONLABELFORMList',
            contextPath: '/PRODUCTIONLABELFORM'
        },
        CustomPageDefinitions
    );
});