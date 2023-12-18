sap.ui.define([
	"./BaseController",
	"../model/models",
	"sap/ui/model/json/JSONModel"
], function (BaseController, models, JSONModel) {
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
			this.setModel(models.getDetailDetailModel.call(this), "empCapacity");
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
				// nTotalUnassignedCap: +oContextObj.AvailabilityInHours - +oContextObj.AbsenceInHours - +oContextObj.nProjectAssigned
				nTotalUnassignedCap: +oContextObj.AvailabilityInHours - +oContextObj.nProjectAssigned
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