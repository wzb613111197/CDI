sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppf004',
            componentId: 'CrewInfoObjectPage',
            contextPath: '/CrewInfo'
        },
        CustomPageDefinitions
    );
});