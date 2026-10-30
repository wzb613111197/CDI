sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheMANAGESHOPFLOORLABELList.iSeeThisPage();
            Then.onTheMANAGESHOPFLOORLABELList.onFilterBar().iCheckFilterField("Production Order");
            Then.onTheMANAGESHOPFLOORLABELList.onTable().iCheckColumns(10, {"ProductionOrder":{"header":"Production Order"},"Material":{"header":"Material"},"MaterialDescription":{"header":"Material Description"},"Workcenter":{"header":"Work Center"},"PlanedQuantity":{"header":"Planned Quantity"},"StorageUnitType":{"header":"Type of Storage Unit"},"BatchNumber":{"header":"Batch Number"},"BasicStartDate":{"header":"Planned Start Date & Time"},"ExpiredDate":{"header":"Expired Date"},"NumberofLabels":{"header":"Number of Labels"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheMANAGESHOPFLOORLABELList.onFilterBar().iExecuteSearch();
            
            Then.onTheMANAGESHOPFLOORLABELList.onTable().iCheckRows();

            When.onTheMANAGESHOPFLOORLABELList.onTable().iPressRow(0);
            Then.onTheMANAGESHOPFLOORLABELObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});