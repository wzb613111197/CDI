sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_MM_BSLR_INTERIMList.iSeeThisPage();
            Then.onTheZI_MM_BSLR_INTERIMList.onFilterBar().iCheckFilterField("Dutiable/Non-dutiable");
            Then.onTheZI_MM_BSLR_INTERIMList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZI_MM_BSLR_INTERIMList.onFilterBar().iCheckFilterField("Area");
            Then.onTheZI_MM_BSLR_INTERIMList.onFilterBar().iCheckFilterField("Key Date");
            Then.onTheZI_MM_BSLR_INTERIMList.onTable().iCheckColumns(10, {"ItemCode":{"header":"Item Code"},"Description":{"header":"Description"},"CustomCode":{"header":"Custom Code"},"Unit":{"header":"Unit"},"UnitofMeasure":{"header":"Unit of Measure"},"DutyStatus":{"header":"Dutiable/Non-dutiable"},"Airline":{"header":"Airline"},"Area":{"header":"Area"},"KeyDate":{"header":"Key Date"},"KeyDateEnd":{"header":"KeyDateEnd"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_MM_BSLR_INTERIMList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_MM_BSLR_INTERIMList.onTable().iCheckRows();

            When.onTheZI_MM_BSLR_INTERIMList.onTable().iPressRow(0);
            Then.onTheZI_MM_BSLR_INTERIMObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});