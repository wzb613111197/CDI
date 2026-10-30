sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.iSeeThisPage();
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iCheckFilterField("Report Type");
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iCheckFilterField("Date");
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iCheckFilterField("Item");
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iCheckFilterField("Duty Status");
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onTable().iCheckColumns(21, {"STONo":{"header":"M.O.no."},"ST":{"header":"ST"},"LTONo":{"header":"LTO_NO"},"CodeNo":{"header":"CODE_NO"},"CustomCode":{"header":"CUSTOM_CODE"},"Description":{"header":"DESCRIPTION"},"Packing":{"header":"PACKING"},"Unit":{"header":"UNIT"},"Carton":{"header":"CARTON"},"ZPartial":{"header":"PARTIAL"},"TTL_QTY":{"header":"TTL_QTY"},"ReportType":{"header":"Report Type"},"ZDate":{"header":"Date"},"Airline":{"header":"Airline"},"Item":{"header":"Item"},"DutyStatus":{"header":"Duty Status"},"DUTYSTATUSTEXT":{"header":"Characteristic Value"},"GRUND":{"header":"Reason for Man. Val."},"RESLO":{"header":"Issuing Storage Loc."},"LGORT":{"header":"Storage Location"},"SaleableType":{"header":"Characteristic Value"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onTable().iCheckRows();

            When.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTList.onTable().iPressRow(0);
            Then.onTheZI_EWM_BOND_DAILY_ISSUE_REPORTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});