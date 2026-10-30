sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_SD_QUERY_QT_HEADList.iSeeThisPage();
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>Quotation}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>SalesOrg}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>DistChannel}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>Division}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>Customer}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iCheckFilterField("{i18n>QTValidDate}");
            Then.onTheZC_SD_QUERY_QT_HEADList.onTable().iCheckColumns(12, {"Quotation":{"header":"{i18n>Quotation}"},"SalesOrg":{"header":"{i18n>SalesOrg}"},"DistChannel":{"header":"{i18n>DistChannel}"},"Division":{"header":"{i18n>Division}"},"HeaderDesc":{"header":"{i18n>HeaderDesc}"},"Customer":{"header":"{i18n>Customer}"},"AirlineCode":{"header":"{i18n>AirlineCode}"},"ContractNo":{"header":"{i18n>ContractNo}"},"QTType":{"header":"{i18n>QTType}"},"Sequence":{"header":"{i18n>Sequence}"},"QTValidFrom":{"header":"{i18n>QTValidDate}"},"QTValidTo":{"header":"{i18n>QTValidTo}"}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_SD_QUERY_QT_HEADList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_SD_QUERY_QT_HEADList.onTable().iCheckRows();

            When.onTheZC_SD_QUERY_QT_HEADList.onTable().iPressRow(0);
            Then.onTheZC_SD_QUERY_QT_HEADObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});