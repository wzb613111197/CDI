sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppf001',
            componentId: 'PRODUCTIONLABELFORMObjectPage',
            contextPath: '/PRODUCTIONLABELFORM'
        },
        CustomPageDefinitions
    );
});