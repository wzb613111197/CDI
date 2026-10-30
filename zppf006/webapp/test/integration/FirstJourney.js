sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();

            Then.onTheZC_PP_FLIGHT_LABELList.iSeeThisPage();
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Plant");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Department ");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Airline");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Flight Number");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Container Material Group");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Work Group1");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Estimated Departure Date");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Estimated Departure Time");
            Then.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iCheckFilterField("Flight Order Status");
            Then.onTheZC_PP_FLIGHT_LABELList.onTable().iCheckColumns(17, {"AirlineCode":{"header":"Airline"},"FlightNumber":{"header":"Flight Number"},"FlightOrderNumber":{"header":"Flight Order Number"},"ETDDate":{"header":"Estimated Departure Date"},"ETDTime":{"header":"Estimated Departure Time"},"FlightOrderStatus":{"header":"Flight Order Status"},"Workgroup":{"header":"Work Group1"},"Galley":{"header":"Galley"},"Stowage":{"header":"Stowage"},"ZPosition":{"header":"Position"},"Barcode":{"header":"Barcode"},"ContainerMaterial":{"header":"Container Material"},"ContainerMaterialGroup":{"header":"Container Material Group"},"LabelColor":{"header":"Label Color"},"zcontainer_id":{"header":"Container ID"},"Plant":{"header":"Plant"},"Department":{"header":"Department "}});

        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheZC_PP_FLIGHT_LABELList.onFilterBar().iExecuteSearch();
            
            Then.onTheZC_PP_FLIGHT_LABELList.onTable().iCheckRows();

            When.onTheZC_PP_FLIGHT_LABELList.onTable().iPressRow(0);
            Then.onTheZC_PP_FLIGHT_LABELObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});