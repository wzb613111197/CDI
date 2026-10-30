sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'com.cathaydining.zewmf005',
            componentId: 'ZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage',
            contextPath: '/ZI_EWM_BOND_DAILY_ISSUE_REPORT'
        },
        CustomPageDefinitions
    );
});