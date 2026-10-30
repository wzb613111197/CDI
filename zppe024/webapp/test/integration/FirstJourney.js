sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_LDGDEF_HDRList.iSeeThisPage();
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Airline Code");
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Customer Loading Cod");
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Loading Def. Name");
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Loading Def. Desc.");
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Valid From");
            Then.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iCheckFilterField("Valid To");
            Then.onTheZC_PP_LDGDEF_HDRList.onTable().iCheckColumns(7, {"AirlineCode":{"header":"Airline Code"},"LoadingDefinitionCode":{"header":"Loading Definition Code"},"LoadingDefinitionName":{"header":"Loading Definition Name"},"LoadingDefinitionDescription":{"header":"Loading Definition Description"},"ValidFrom":{"header":"Valid From"},"ValidTo":{"header":"Valid To"},"HandleType":{"header":"Handle Type"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_LDGDEF_HDRList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_LDGDEF_HDRList.onTable().iCheckRows();

            When.onTheZC_PP_LDGDEF_HDRList.onTable().iPressRow(0);
            Then.onTheZC_PP_LDGDEF_HDRObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});