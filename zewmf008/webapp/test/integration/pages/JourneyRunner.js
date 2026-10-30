sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmf008/zewmf008/test/integration/pages/ZI_EWM_BOND_STOCK_LEDGER_RPTList",
	"com/cathaydining/zewmf008/zewmf008/test/integration/pages/ZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage"
], function (JourneyRunner, ZI_EWM_BOND_STOCK_LEDGER_RPTList, ZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmf008/zewmf008') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_EWM_BOND_STOCK_LEDGER_RPTList: ZI_EWM_BOND_STOCK_LEDGER_RPTList,
			onTheZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage: ZI_EWM_BOND_STOCK_LEDGER_RPTObjectPage
        },
        async: true
    });

    return runner;
});

