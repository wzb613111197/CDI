sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.iSeeThisPage();
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onFilterBar().iCheckFilterField("Area");
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onFilterBar().iCheckFilterField("Date");
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onTable().iCheckColumns(9, {"FlightDate":{"header":"Date"},"ReportCategory":{"header":"Liquor/Tabacco"},"AirlineCode":{"header":"Airline"},"Area":{"header":"Area"},"EndorsementDate":{"header":"Endorsement Date"},"EndorsementTime":{"header":"Endorsement Time"},"EndorsedBy":{"header":"EndorsedBy"},"FormNumber":{"header":"FormNumber"},"FormVersion":{"header":"FormVersion"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onTable().iCheckRows();

            When.onTheZC_MM_DUTIABLE_ITEM_INTERIMList.onTable().iPressRow(0);
            Then.onTheZC_MM_DUTIABLE_ITEM_INTERIMObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});