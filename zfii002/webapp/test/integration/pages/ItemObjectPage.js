sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zfii002',
            componentId: 'ItemObjectPage',
            contextPath: '/Head/_Item'
        },
        CustomPageDefinitions
    );
});