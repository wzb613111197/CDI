sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_OVRFLOW_RULEList.iSeeThisPage();
            Then.onTheZC_PP_OVRFLOW_RULEList.onFilterBar().iCheckFilterField("{@i18n>AirlineCode}");
            Then.onTheZC_PP_OVRFLOW_RULEList.onTable().iCheckColumns(11, {"AirlineCode":{"header":"{@i18n>AirlineCode}"},"IsExcept":{"header":"{@i18n>IsExcept}"},"HaulType":{"header":"{@i18n>HaulType}"},"Orign":{"header":"{@i18n>Orign}"},"Dest":{"header":"{@i18n>Dest}"},"ClassSrc":{"header":"{@i18n>ClassSrc}"},"ClassTat":{"header":"{@i18n>ClassTat}"},"ValidFrom":{"header":"{@i18n>ValidFrom}"},"ValidTo":{"header":"{@i18n>ValidTo}"},"FltNum":{"header":"{@i18n>FltNum}"},"TatChoices":{"header":"{@i18n>TatChoices}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_OVRFLOW_RULEList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_OVRFLOW_RULEList.onTable().iCheckRows();

            When.onTheZC_PP_OVRFLOW_RULEList.onTable().iPressRow(0);
            Then.onTheZC_PP_OVRFLOW_RULEObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});