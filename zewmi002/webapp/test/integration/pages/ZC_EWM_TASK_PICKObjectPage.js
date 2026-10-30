sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewmi002',
            componentId: 'ZC_EWM_TASK_PICKObjectPage',
            contextPath: '/ZC_EWM_TASK_PICK'
        },
        CustomPageDefinitions
    );
});