sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zsde005.createquo',
            componentId: 'ZI_SD_QT_MATERIALObjectPage',
            contextPath: '/ZI_SD_QT_MATERIAL'
        },
        CustomPageDefinitions
    );
});