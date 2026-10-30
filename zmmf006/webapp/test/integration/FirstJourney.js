sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.iSeeThisPage();
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onFilterBar().iCheckFilterField("Month/Year");
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onFilterBar().iCheckFilterField("Area");
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onFilterBar().iCheckFilterField("Duty Status");
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onTable().iCheckColumns(4, {"ReportMonth":{"header":"Month / Year"},"Area":{"header":"Area"},"AirlineCode":{"header":"Airline"},"DutyStatus":{"header":"Duty Status"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onTable().iCheckRows();

            When.onTheZC_MM_MONTH_FLT_CONS_INTERIMList.onTable().iPressRow(0);
            Then.onTheZC_MM_MONTH_FLT_CONS_INTERIMObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});