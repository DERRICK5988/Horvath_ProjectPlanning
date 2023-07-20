sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/Sorter",
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter) {
	"use strict";

	return BaseController.extend("StaffingApp.horvath.controller.DetailDetail", {

		/* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
        * Called when empCapacity is initantiated 
        * @public
        */
		onInit: function () {
			var oOwnerComponent = this.getOwnerComponent();
			this.oRouter = oOwnerComponent.getRouter();
			this.oModel = oOwnerComponent.getModel();
			var oViewModel = new JSONModel({
				busy: false,
				selectedView: "DAY"
			});
			this.setModel(oViewModel, "empCapacity");
			this.oRouter.getRoute("detailDetail").attachPatternMatched(this._onPatternMatch, this);
		},

		/* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view [empCapacity] to the object path and expands the aggregated line items.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
		_onPatternMatch: function (oEvent) {
			var oArguments = oEvent.getParameter("arguments"),
				oContextObj = JSON.parse(decodeURIComponent(oArguments.object));

			this.getModel("empCapacity").setProperty("/busy", true);
			this.getModel("empCapacity").setData(Object.assign(this.getModel("empCapacity").getData(), {
				oDetail: oContextObj,
				nTotalAssignedCap: oContextObj.AvailabilityInHours,
				nAbsence: oContextObj.AbsenceInHours,
				aItem: oContextObj.aEmpRemaingDays,
				nTotalWorkCap: oContextObj.nProjectAssigned,
				nTotalUnassignedCap: +oContextObj.AvailabilityInHours - +oContextObj.AbsenceInHours - +oContextObj.nProjectAssigned
			}));
			this.getView().getModel("empCapacity").refresh(true);
			this.getView().getModel("empCapacity").setProperty("/busy", false);
		},

		onExit: function () {
			this.oRouter.getRoute("detailDetail").detachPatternMatched(this._onPatternMatch, this);
		},

		onEndColumnClose: function (oEvent) {
			this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
		}
	});
});