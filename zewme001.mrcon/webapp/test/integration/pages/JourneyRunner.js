sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewme001/mrcon/test/integration/pages/mr_consolidationList",
	"com/cathaydining/zewme001/mrcon/test/integration/pages/mr_consolidationObjectPage"
], function (JourneyRunner, mr_consolidationList, mr_consolidationObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewme001/mrcon') + '/test/flp.html#app-preview',
        pages: {
			onThemr_consolidationList: mr_consolidationList,
			onThemr_consolidationObjectPage: mr_consolidationObjectPage
        },
        async: true
    });

    return runner;
});

