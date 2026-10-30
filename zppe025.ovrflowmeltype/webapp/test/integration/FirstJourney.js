sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_OVRFLOW_MELTYPList.iSeeThisPage();
            Then.onTheZC_PP_OVRFLOW_MELTYPList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_PP_OVRFLOW_MELTYPList.onTable().iCheckColumns(9, {"AirlineCode":{"header":"Airline"},"OverflowClass":{"header":"Overflow Class"},"MealType":{"header":"Meal Type"},"ValidFrom":{"header":"Valid From"},"ValidTo":{"header":"Valid To"},"CreatedBy":{"header":"{i18n>CreatedBy}"},"CreatedAt":{"header":"{i18n>CreatedAt}"},"ChangedBy":{"header":"{i18n>ChangedBy}"},"ChangedAt":{"header":"{i18n>ChangedAt}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_OVRFLOW_MELTYPList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_OVRFLOW_MELTYPList.onTable().iCheckRows();

            When.onTheZC_PP_OVRFLOW_MELTYPList.onTable().iPressRow(0);
            Then.onTheZC_PP_OVRFLOW_MELTYPObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});