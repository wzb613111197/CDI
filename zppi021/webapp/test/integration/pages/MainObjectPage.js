sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppi021',
            componentId: 'MainObjectPage',
            contextPath: '/Main'
        },
        CustomPageDefinitions
    );
});