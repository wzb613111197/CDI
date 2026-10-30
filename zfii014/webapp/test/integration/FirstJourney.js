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
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Run Date");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Run ID");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Company Code");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Document");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Date");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Posting Date");
            Then.onTheMainList.onFilterBar().iCheckFilterField("House Bank");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Status Level 0");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Status Level 1");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Status Level 1");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Payment Status Level 2");
            Then.onTheMainList.onTable().iCheckColumns(21, {"Laufd":{"header":"Payment Run Date"},"Laufi":{"header":"Payment Run ID"},"Zbukr":{"header":"Company Code"},"Vblnr":{"header":"Payment Document"},"Zaldt":{"header":"Payment Date"},"Lifnr":{"header":"Vendor"},"Kunnr":{"header":"Customer"},"Name1":{"header":"Name 1"},"ZgrpstsJpmAck0":{"header":"Payment Status Level 0"},"ZreasonJpmAck0":{"header":"Payment Rejection Error Message 0"},"ZtxstsJpmAck1":{"header":"Payment Status Level 1"},"ZreasonJpmAck1":{"header":"Payment Rejection Error Message 1"},"ZgrpstsHsbcAck1":{"header":"Payment Status Level 1"},"Rbetr":{"header":"Payment Amount"},"ZreasonHsbcAck1":{"header":"Payment Rejection Error Message 1"},"ZtxstsHsbcAck2":{"header":"Payment Status Level 2"},"ZreasonHsbcAck2":{"header":"Payment Rejection Error Message 2"},"Rwbtr":{"header":"Amount in Document Currency"},"Waers":{"header":"Currency"},"FileDate":{"header":"File Date"},"FileTime":{"header":"File Time"}});

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