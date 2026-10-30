sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zppf001/test/integration/pages/PRODUCTIONLABELFORMList",
	"com/cathaydining/zppf001/test/integration/pages/PRODUCTIONLABELFORMObjectPage"
], function (JourneyRunner, PRODUCTIONLABELFORMList, PRODUCTIONLABELFORMObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zppf001') + '/test/flp.html#app-preview',
        pages: {
			onThePRODUCTIONLABELFORMList: PRODUCTIONLABELFORMList,
			onThePRODUCTIONLABELFORMObjectPage: PRODUCTIONLABELFORMObjectPage
        },
        async: true
    });

    return runner;
});

