sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zppf012',
            componentId: 'ZI_PP_DISH_LABEL_FORM_PRINTObjectPage',
            contextPath: '/ZI_PP_DISH_LABEL_FORM_PRINT'
        },
        CustomPageDefinitions
    );
});