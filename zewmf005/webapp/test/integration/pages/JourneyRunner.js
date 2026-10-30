sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmf005/test/integration/pages/ZI_EWM_BOND_DAILY_ISSUE_REPORTList",
	"com/cathaydining/zewmf005/test/integration/pages/ZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage"
], function (JourneyRunner, ZI_EWM_BOND_DAILY_ISSUE_REPORTList, ZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmf005') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList: ZI_EWM_BOND_DAILY_ISSUE_REPORTList,
			onTheZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage: ZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage
        },
        async: true
    });

    return runner;
});

