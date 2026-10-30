sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zsde005.createquo',
            componentId: 'ZI_SD_QT_MATERIALList',
            contextPath: '/ZI_SD_QT_MATERIAL'
        },
        CustomPageDefinitions
    );
});