sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewme004',
            componentId: 'ZC_EWM_RELOCDOCObjectPage',
            contextPath: '/ZC_EWM_RELOCDOC'
        },
        CustomPageDefinitions
    );
});