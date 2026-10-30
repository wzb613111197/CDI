sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zfif002',
            componentId: 'mainObjectPage',
            contextPath: '/main'
        },
        CustomPageDefinitions
    );
});