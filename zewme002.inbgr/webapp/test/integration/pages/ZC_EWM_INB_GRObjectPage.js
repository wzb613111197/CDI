sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewme002.inbgr',
            componentId: 'ZC_EWM_INB_GRObjectPage',
            contextPath: '/ZC_EWM_INB_GR'
        },
        CustomPageDefinitions
    );
});