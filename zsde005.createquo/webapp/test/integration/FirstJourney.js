sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_SD_QT_MATERIALList.iSeeThisPage();

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_SD_QT_MATERIALList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_SD_QT_MATERIALList.onTable().iCheckRows();

            When.onTheZI_SD_QT_MATERIALList.onTable().iPressRow(0);
            Then.onTheZI_SD_QT_MATERIALObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});