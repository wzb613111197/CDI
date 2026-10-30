sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/cathaydining/zewmf009/test/integration/pages/ZI_EWM_INVENTORYList",
	"com/cathaydining/zewmf009/test/integration/pages/ZI_EWM_INVENTORYObjectPage"
], function (JourneyRunner, ZI_EWM_INVENTORYList, ZI_EWM_INVENTORYObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/cathaydining/zewmf009') + '/test/flp.html#app-preview',
        pages: {
			onTheZI_EWM_INVENTORYList: ZI_EWM_INVENTORYList,
			onTheZI_EWM_INVENTORYObjectPage: ZI_EWM_INVENTORYObjectPage
        },
        async: true
    });

    return runner;
});

