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
            Then.onTheMainList.onFilterBar().iCheckFilterField("Company Code");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Material");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Material Group");
            Then.onTheMainList.onFilterBar().iCheckFilterField("Supplier");
            Then.onTheMainList.onFilterBar().iCheckFilterField("From");
            Then.onTheMainList.onFilterBar().iCheckFilterField("To");
            Then.onTheMainList.onTable().iCheckColumns(27, {"zeffdate":{"header":"Next Update"},"bukrs":{"header":"Company Code"},"matnr":{"header":"Material"},"maktx":{"header":"Material Description"},"matkl":{"header":"Material Group"},"meins":{"header":"Base Unit of Measure"},"lifnr":{"header":"Supplier"},"lifnrname":{"header":"Name"},"zquotdt":{"header":"Last Quotation Date"},"zquotprice":{"header":"Last Quotation Price"},"zlastinvdt":{"header":"Last Invoice Date"},"zavgmatcost":{"header":"Avg Material Cost"},"zavgfrtcost":{"header":"Avg Freight & Handling Cost"},"zq2aindexpct":{"header":"Variance Avg → Quotation (%)"},"zmatriskpct":{"header":"Material Cost Risk Premium (%)"},"zfrtriskpct":{"header":"Freight Cost Risk Premium (%)"},"zpremmatcalc":{"header":"Premium Material Cost (Calculated)"},"zpremfrtcalc":{"header":"Premium Freight Cost (Calculated)"},"zpremmatman":{"header":"Premium Material Cost (Manual)"},"zpremfrtman":{"header":"Premium Freight Cost (Manual)"},"zstdtotal":{"header":"Total Standard Cost"},"zprevstd":{"header":"Previous Standard Cost"},"zprevstdupd":{"header":"Last Update (Std Cost)"},"zstdvarpct":{"header":"Variance for Standard Cost (%)"},"waers":{"header":"Currency"},"sdate":{"header":"From"},"edate":{"header":"To"}});

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