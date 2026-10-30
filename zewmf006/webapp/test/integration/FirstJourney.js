sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.iSeeThisPage();
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iCheckFilterField("Date");
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iCheckFilterField("Duty Status");
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iCheckFilterField("Warehouse");
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iCheckFilterField("Report Type");
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onTable().iCheckColumns(22, {"Airline":{"header":"Airline"},"Item":{"header":"Item"},"CustomCode":{"header":"Custom Code"},"Description":{"header":"Description"},"Packing":{"header":"Packing"},"UM":{"header":"UM"},"DGUM":{"header":"DG-UM"},"DGCT":{"header":"DG-CT"},"DGTU":{"header":"DG-TU"},"PSUM":{"header":"PS-UM"},"PSCT":{"header":"PS-CT"},"PSTU":{"header":"PS-TU"},"FloatUM":{"header":"Float-UM"},"FloatCT":{"header":"Float-CT"},"FloatTU":{"header":"Float-TU"},"TotalUM":{"header":"Total-UM"},"TotalCT":{"header":"Total-CT"},"TotalTU":{"header":"Total-TU"},"ReportDate":{"header":"Date"},"DutyStatus":{"header":"Duty Status"},"Warehouse":{"header":"Warehouse"},"ReportType":{"header":"Report Type"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onTable().iCheckRows();

            When.onTheZI_EWM_BOND_DAILY_CLOSING_RPTList.onTable().iPressRow(0);
            Then.onTheZI_EWM_BOND_DAILY_CLOSING_RPTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});