sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zmme015.gilog',
            componentId: 'LogObjectPage',
            contextPath: '/Log'
        },
        CustomPageDefinitions
    );
});