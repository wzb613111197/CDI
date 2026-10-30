sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zsde005.changequo',
            componentId: 'ZC_SD_QUERY_QT_HEADList',
            contextPath: '/ZC_SD_QUERY_QT_HEAD'
        },
        CustomPageDefinitions
    );
});