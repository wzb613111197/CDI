sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmf006/test/integration/pages/ZI_EWM_BOND_DAILY_CLOSING_RPTList",
	"com/cathaydining/zewmf006/test/integration/pages/ZI_EWM_BOND_DAILY_CLOSING_RPTObjectPage"
], function (JourneyRunner, ZI_EWM_BOND_DAILY_CLOSING_RPTList, ZI_EWM_BOND_DAILY_CLOSING_RPTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmf006') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_EWM_BOND_DAILY_CLOSING_RPTList: ZI_EWM_BOND_DAILY_CLOSING_RPTList,
			onTheZI_EWM_BOND_DAILY_CLOSING_RPTObjectPage: ZI_EWM_BOND_DAILY_CLOSING_RPTObjectPage
        },
        async: true
    });

    return runner;
});

