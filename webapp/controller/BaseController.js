sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/message/Message"
], function (Controller, History, formatter, Filter, FilterOperator, Sorter, Message) {
    "use strict";

    return Controller.extend("StaffingApp.horvath.controller.BaseController", {
        formatter: formatter,
        /**
         * Convenience method for accessing the router in every controller of the application.
         * @public
         * @returns {sap.ui.core.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name in every controller of the application.
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting the view model in every controller of the application.
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting the resource bundle.
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
         */
        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },
        /**
         * Event handler for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the list route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("list", {}, true);
            }
        },
        getCurrentPeriod: function () {
            var nMinMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 1, "01"].join("-"))),
                nMaxMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 4, "01"].join("-")));
            return { nMinMth: +nMinMth, nMaxMth: +nMaxMth };
        },
        getResourcePath: function (oContextObj, oCurrPeriod) {
            return [{
                oModel: this.getView().getModel(), sPath: "/WorkpackageSet",
                aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.EngagementProject)],
                oParams: { "$select": "WorkPackageID,WorkPackageName" },
                aSort: [new Sorter("WorkPackageID", false)]
            },
            {
                oModel: this.getView().getModel("EmployeeCapacity"),
                sPath: "/YY1_EMP_CAPACITY_API",
                aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.EngagementProject)],
                aSort: [new Sorter("PersonWorkAgreement", false), new Sorter("YearMth", false)]
            },
            {
                oModel: this.getOwnerComponent().getModel("PROJ_ENGMT_UPDATE_SRV"),
                sPath: "/A_EngmntProjRsceSup",
                oParams: { "$select": "WorkPackage,Version,Quantity,PersonWorkAgreement" },
                aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.EngagementProject)]
            },
            {
                oModel: this.getView().getModel("ProjectAssignmentDistr"),
                sPath: "/YY1_PROJ_ASSIGNMENT_DISTR",
                aFilters: [
                    new Filter("Project", FilterOperator.EQ, oContextObj.EngagementProject),
                    // new Filter("YearMth", FilterOperator.BT, oCurrPeriod.nMinMth.toString(), oCurrPeriod.nMaxMth.toString(), true)
                    new Filter("YearMth", FilterOperator.LE, oCurrPeriod.nMaxMth.toString(), true)
                ],
                aSort: [new Sorter("YearMth", false)]
            },
            {
                oModel: this.getView().getModel("TimeRecording"),
                sPath: "/YY1_TIME_RECORDING",
                aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.EngagementProject)],
                aSort: [new Sorter("YearMth", false)]
            }];
        },
        updateModel: function (Object) {
            Object.oModel.update(Object.sKey, Object.oPayload, Object.mParameters);
        },
        fetchResources: function (Object) {
            // @ts-ignore
            return new Promise(
                function (resolve, reject) {
                    Object.oModel.read(Object.sPath, {
                        filters: Object.aFilters,
                        sorters: Object.aSort,
                        urlParameters: Object.oParams,
                        // @ts-ignore
                        success: function (oData, oResponse) {
                            resolve(oData);
                        }.bind(this),
                        error: function (error) {
                            reject(error);
                        }.bind(this)
                    });
                });
        },
        addMessageManager: function (Object) {
            var oMessage = new Message({
                message: Object.message,
                type: Object.type,
                target: "/messagePath",
                processor: null
            });
            sap.ui.getCore().getMessageManager().addMessages(oMessage);
        }
    });

});