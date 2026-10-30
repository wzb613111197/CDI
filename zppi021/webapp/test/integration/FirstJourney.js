sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheMainList.iSeeThisPage();
            Then.onTheMainList.onFilterBar().iCheckFilterField("Scheduled Departure Date");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Created At");
            Then.onTheMainList.onFilterBar().iCheckFilterField("CUP Batch");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Specification Type");
            Then.onTheMainList.onTable().iCheckColumns(16, {"ZmesCode":{"header":"Message Code"},"ZmesDes":{"header":"Message Description"},"ZcupBatch":{"header":"CUP Batch"},"ZcupName":{"header":"CUP Name"},"ZairlineCode":{"header":"Airline Code"},"ZstdDate":{"header":"Scheduled Departure Date"},"ZfltNum":{"header":"Flight Number"},"Zsector":{"header":"Sector"},"ZserSeq":{"header":"Service Sequence"},"ZcabinClass":{"header":"Cabin Class"},"ZspecType":{"header":"Specification Type"},"ZcusLdgtempCode":{"header":"Customer Loading Template Code"},"ZflordNo":{"header":"Flight Order"},"Zfltversion":{"header":"Flight Order Version"},"ZcreatedAt":{"header":"Created At"},"ZcreatedBy":{"header":"Created By"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheMainList.onFilterBar().iExecuteSearch();
            
            Then.onTheMainList.onTable().iCheckRows();

            When.onTheMainList.onTable().iPressRow(0);
            Then.onTheMainObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});