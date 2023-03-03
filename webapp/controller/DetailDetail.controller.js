sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
    "../model/formatter",
], function (BaseController) {
	"use strict";

	return BaseController.extend("StaffingApp.horvath.controller.DetailDetail", {
		onInit: function () {
            debugger;
			var oOwnerComponent = this.getOwnerComponent();

			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();

			this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onPatternMatch, this);
		},

		_onPatternMatch: function (oEvent) {
			debugger;
			// this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
			this.getModel("appView").setProperty("/layout", "ThreeColumnsMidExpanded");
			
			// this._supplier = oEvent.getParameter("arguments").supplier || this._supplier || "0";
			// this._product = oEvent.getParameter("arguments").product || this._product || "0";

			// this.getView().bindElement({
			// 	path: "/ProductCollectionStats/Filters/1/values/" + this._supplier,
			// 	model: "products"
			// });
		},

		onExit: function () {
			this.oRouter.getRoute("detailDetail").detachPatternMatched(this._onPatternMatch, this);
		}
	});
});
