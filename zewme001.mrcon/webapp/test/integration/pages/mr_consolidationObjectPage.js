sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewme001.mrcon',
            componentId: 'mr_consolidationObjectPage',
            contextPath: '/mr_consolidation'
        },
        CustomPageDefinitions
    );
});