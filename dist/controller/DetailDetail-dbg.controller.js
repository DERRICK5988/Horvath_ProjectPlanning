sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
	"use strict";

	return BaseController.extend("StaffingApp.horvath.controller.DetailDetail", {
		onInit: function () {
			debugger;
			var oOwnerComponent = this.getOwnerComponent();
			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();
			var oViewModel = new JSONModel({
				busy: false
			});
			this.setModel(oViewModel, "empCapacity");
			this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onPatternMatch, this);
		},

		_onPatternMatch: function (oEvent) {
			debugger;
			var oArguments = oEvent.getParameter("arguments"),
				oContextObj = JSON.parse(decodeURIComponent(oArguments.object));
			this.getModel("empCapacity").setProperty("/busy",true);
			this.getModel("empCapacity").setData(Object.assign(this.getModel("empCapacity").getData(), {
				oDetail: oContextObj,
			}));
			this.getModel("empCapacity").setProperty("/busy",false);
			// this.getModel("appView").setProperty("/layout", "ThreeColumnsMidExpanded");

			// this._supplier = oEvent.getParameter("arguments").supplier || this._supplier || "0";
			// this._product = oEvent.getParameter("arguments").product || this._product || "0";

			// this.getView().bindElement({
			// 	path: "/ProductCollectionStats/Filters/1/values/" + this._supplier,
			// 	model: "products"
			// });
		},

		onExit: function () {
			this.oRouter.getRoute("detailDetail").detachPatternMatched(this._onPatternMatch, this);
		},

		onEndColumnClose: function (oEvent) {
			debugger;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
		}
	});
});