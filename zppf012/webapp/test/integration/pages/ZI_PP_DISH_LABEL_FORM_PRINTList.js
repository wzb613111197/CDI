sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'com.cathaydining.zppf012',
            componentId: 'ZI_PP_DISH_LABEL_FORM_PRINTList',
            contextPath: '/ZI_PP_DISH_LABEL_FORM_PRINT'
        },
        CustomPageDefinitions
    );
});