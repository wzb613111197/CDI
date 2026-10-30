sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zcoe001.download',
            componentId: 'MainObjectPage',
            contextPath: '/Main'
        },
        CustomPageDefinitions
    );
});