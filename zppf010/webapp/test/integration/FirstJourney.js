sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onThezc_pp_top_up_labelList.iSeeThisPage();
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Flight Order Number");
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Plant");
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Change notification number");
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Airline Code");
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Flight Number");
            Then.onThezc_pp_top_up_labelList.onFilterBar().iCheckFilterField("Scheduled departure date");
            Then.onThezc_pp_top_up_labelList.onTable().iCheckColumns(8, {"Zcnno":{"header":"Change notification number"},"Mblnr":{"header":"Material Document"},"Zeile":{"header":"Item"},"Matnr":{"header":"Material"},"Maktx":{"header":"Material Description"},"Menge":{"header":"Quantity"},"Meins":{"header":"Unit of Measure"},"Zrstatus":{"header":"Received Status"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onThezc_pp_top_up_labelList.onFilterBar().iExecuteSearch();
            
            Then.onThezc_pp_top_up_labelList.onTable().iCheckRows();

            When.onThezc_pp_top_up_labelList.onTable().iPressRow(0);
            Then.onThezc_pp_top_up_labelObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});