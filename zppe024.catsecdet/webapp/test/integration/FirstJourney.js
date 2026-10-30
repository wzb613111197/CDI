sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_CAT_SEC_DETList.iSeeThisPage();
            Then.onTheZC_PP_CAT_SEC_DETList.onFilterBar().iCheckFilterField("{i18n>AirlineCode}");
            Then.onTheZC_PP_CAT_SEC_DETList.onFilterBar().iCheckFilterField("{i18n>Origin}");
            Then.onTheZC_PP_CAT_SEC_DETList.onFilterBar().iCheckFilterField("{i18n>Dest}");
            Then.onTheZC_PP_CAT_SEC_DETList.onTable().iCheckColumns(5, {"AirlineCode":{"header":"{i18n>AirlineCode}"},"Origin":{"header":"{i18n>Origin}"},"Dest":{"header":"{i18n>Dest}"},"ValidFrom":{"header":"{i18n>ValidFrom}"},"ValidTo":{"header":"{i18n>IsActive}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_CAT_SEC_DETList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_CAT_SEC_DETList.onTable().iCheckRows();

            When.onTheZC_PP_CAT_SEC_DETList.onTable().iPressRow(0);
            Then.onTheZC_PP_CAT_SEC_DETObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});