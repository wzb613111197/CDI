/*global QUnit*/

sap.ui.define([
	"com/cathaydining/zsde005/copyquo/controller/ObjectPage.controller"
], function (Controller) {
	"use strict";

	QUnit.module("ObjectPage Controller");

	QUnit.test("I should test the ObjectPage controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
