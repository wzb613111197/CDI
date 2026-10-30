sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheCrewInfoList.iSeeThisPage();
            Then.onTheCrewInfoList.onFilterBar().iCheckFilterField("Plant");
            Then.onTheCrewInfoList.onFilterBar().iCheckFilterField("Valid From");
            Then.onTheCrewInfoList.onFilterBar().iCheckFilterField("Valid To");
            Then.onTheCrewInfoList.onFilterBar().iCheckFilterField("Airline Code");
            Then.onTheCrewInfoList.onFilterBar().iCheckFilterField("Flight Number");
            Then.onTheCrewInfoList.onTable().iCheckColumns(7, {"Werks":{"header":"Plant"},"ZciNumber":{"header":"Crew Information Number"},"ZvalidFrom":{"header":"Valid From"},"ZvalidTo":{"header":"Valid To"},"ZairlineCode":{"header":"Airline Code"},"ZciName":{"header":"Crew Information Name"},"ZfltNum":{"header":"Flight Number"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheCrewInfoList.onFilterBar().iExecuteSearch();
            
            Then.onTheCrewInfoList.onTable().iCheckRows();

            When.onTheCrewInfoList.onTable().iPressRow(0);
            Then.onTheCrewInfoObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});