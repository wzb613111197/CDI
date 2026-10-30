sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zsdr005',
            componentId: 'ZC_SD_STANDARD_BILLING_REPORTObjectPage',
            contextPath: '/ZC_SD_STANDARD_BILLING_REPORT'
        },
        CustomPageDefinitions
    );
});