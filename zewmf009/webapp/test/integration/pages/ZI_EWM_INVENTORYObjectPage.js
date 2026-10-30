sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewmf009',
            componentId: 'ZI_EWM_INVENTORYObjectPage',
            contextPath: '/ZI_EWM_INVENTORY'
        },
        CustomPageDefinitions
    );
});