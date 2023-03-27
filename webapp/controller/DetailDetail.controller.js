sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter) {
	"use strict";

	return BaseController.extend("StaffingApp.horvath.controller.DetailDetail", {
		onInit: function () {
			debugger;
			var oOwnerComponent = this.getOwnerComponent();
			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();
			var oViewModel = new JSONModel({
				busy: false,
				selectedView: "HOUR"
			});
			this.setModel(oViewModel, "empCapacity");
			this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onPatternMatch, this);
		},

		_onPatternMatch: function (oEvent) {
			var oArguments = oEvent.getParameter("arguments"),
				oContextObj = JSON.parse(decodeURIComponent(oArguments.object));
			this.getModel("empCapacity").setProperty("/busy", true);
			this.getModel("empCapacity").setData(Object.assign(this.getModel("empCapacity").getData(), {
				oDetail: oContextObj,
			}));
			debugger;
			Promise.all([
				this.fetchResources({
					oModel: this.getView().getModel("EmployeeCapacity"),
					sPath: "/YY1_EMP_CAPACITY_API",
					aFilters: [
						new Filter("PersonWorkAgreement", FilterOperator.EQ, oContextObj.PersonWorkAgreement),
						new Filter("YearMth", FilterOperator.EQ, oContextObj.YearMth)
					],
					aSort: [new Sorter("EngagementProject", false), new Sorter("YearMth", false)]
				})]).then(function(oData) {
					debugger;
					var aEmpCapacity = oData[0].results,
						nTotalAssignedCap = +aEmpCapacity.map((o) => o.AvailabilityInHours).reduce((prev, curr) => +prev + +curr, 0),
						nTotalWorkCap = +aEmpCapacity.map((o) => o.PlndEffortQty).reduce((prev, curr) => +prev + +curr, 0);
					this.getModel("empCapacity").setData(Object.assign(this.getModel("empCapacity").getData(), {
						aItem: aEmpCapacity,
						nTotalAssignedCap: nTotalAssignedCap,
						nTotalWorkCap: nTotalWorkCap,
						nTotalUnassignedCap: +nTotalAssignedCap - +nTotalWorkCap
					}));
					this.getView().getModel("empCapacity").refresh(true);
					this.getView().getModel("empCapacity").setProperty("/busy", false);
				}.bind(this));
		},

		onExit: function () {
			this.oRouter.getRoute("detailDetail").detachPatternMatched(this._onPatternMatch, this);
		},

		onEndColumnClose: function (oEvent) {
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
		}
	});
});