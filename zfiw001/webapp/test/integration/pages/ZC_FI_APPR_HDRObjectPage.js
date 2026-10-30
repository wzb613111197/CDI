sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zfiw001',
            componentId: 'ZC_FI_APPR_HDRObjectPage',
            contextPath: '/ZC_FI_APPR_HDR'
        },
        CustomPageDefinitions
    );
});