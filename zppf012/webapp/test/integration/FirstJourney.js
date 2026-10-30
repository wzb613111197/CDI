sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZI_PP_DISH_LABEL_FORM_PRINTList.iSeeThisPage();
            Then.onTheZI_PP_DISH_LABEL_FORM_PRINTList.onFilterBar().iCheckFilterField("Production Order");
            Then.onTheZI_PP_DISH_LABEL_FORM_PRINTList.onTable().iCheckColumns(8, {"ProductionOrder":{"header":"Production Order"},"MaterialCode":{"header":"Material Code"},"MaterialDescription":{"header":"Material Description"},"ProdOrderBasedQuantity":{"header":"Prod Order Based Quantity"},"Numberoflabels":{"header":"Number of labels"},"ProductionOrder_SUM":{"header":"Order"},"MaterialDescription_ZF":{"header":"Material Description"},"ProdOrderUnit":{"header":"Base Unit of Measure"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZI_PP_DISH_LABEL_FORM_PRINTList.onFilterBar().iExecuteSearch();
            
            Then.onTheZI_PP_DISH_LABEL_FORM_PRINTList.onTable().iCheckRows();

            When.onTheZI_PP_DISH_LABEL_FORM_PRINTList.onTable().iPressRow(0);
            Then.onTheZI_PP_DISH_LABEL_FORM_PRINTObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});