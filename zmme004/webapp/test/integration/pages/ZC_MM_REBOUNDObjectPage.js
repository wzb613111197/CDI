sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zmme004',
            componentId: 'ZC_MM_REBOUNDObjectPage',
            contextPath: '/ZC_MM_REBOUND'
        },
        CustomPageDefinitions
    );
});