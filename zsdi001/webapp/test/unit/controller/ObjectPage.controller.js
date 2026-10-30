/*global QUnit*/

sap.ui.define([
	"com/cathaydining/zsdi001/controller/ObjectPage.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ObjectPage Controller");

	QUnit.test("I should test the ObjectPage controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
