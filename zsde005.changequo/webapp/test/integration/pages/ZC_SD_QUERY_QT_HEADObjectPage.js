sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zsde005.changequo',
            componentId: 'ZC_SD_QUERY_QT_HEADObjectPage',
            contextPath: '/ZC_SD_QUERY_QT_HEAD'
        },
        CustomPageDefinitions
    );
});