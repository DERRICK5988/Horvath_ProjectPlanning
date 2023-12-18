sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/core/message/Message",
    "sap/m/MessageBox"
], function (Controller, History, formatter, Filter, FilterOperator, Sorter, Message, MessageBox) {
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
        /**
         * Set current period
         * @public
         */
        getCurrentPeriod: function () {
            var nMinMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 1, "01"].join("-"))),
                nMaxMth = this.formatter.returnDataFormat("yyyyMM").format(new Date([new Date().getFullYear(), new Date().getMonth() + 4, "01"].join("-")));
            return {
                nMinMth: +nMinMth,
                nMaxMth: +nMaxMth
            };
        },
        getResourcePath: function (oContextObj, oCurrPeriod) {
            return [{
                    oModel: this.getView().getModel(),
                    sPath: "/WorkpackageSet",
                    aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.EngagementProject)],
                    oParams: {
                        "$select": "WorkPackageID,WorkPackageName"
                    },
                    aSort: [new Sorter("WorkPackageID", false)]
                },
                {
                    oModel: this.getView().getModel("EmployeeCapacity"),
                    sPath: "/YY1_EMP_CAPACITY_API",
                    aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.EngagementProject)],
                    aSort: [new Sorter("PersonWorkAgreement", false), new Sorter("YearMth", false)]
                },
                {
                    oModel: this.getOwnerComponent().getModel("SC_PROJ_ENGMT_CREATE_UPD_SRV"),
                    sPath: "/A_EngmntProjRsceSup",
                    oParams: {
                        "$select": "WorkPackage,Version,Quantity,PersonWorkAgreement,to_ResourceSupplyDistribution,to_ResourceDemand",
                        "$expand": "to_ResourceSupplyDistribution,to_ResourceDemand,to_ResourceDemand/to_ResourceDemandDistribution"
                    },
                    aFilters: [new Filter("EngagementProject", FilterOperator.EQ, oContextObj.EngagementProject)]
                },
                {
                    oModel: this.getView().getModel("ProjectAssignmentDistr"),
                    sPath: "/YY1_PROJ_ASSIGNMENT_DISTR",
                    aFilters: [
                        new Filter("Project", FilterOperator.EQ, oContextObj.EngagementProject)
                        // new Filter("YearMth", FilterOperator.GE, oCurrPeriod.nMinMth.toString(), true)
                    ],
                    aSort: [new Sorter("ProjDmndRsceAssgmt", false), new Sorter("YearMth", false)]
                },
                {
                    oModel: this.getView().getModel("TimeRecording"),
                    sPath: "/YY1_TIME_RECORDING",
                    aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.EngagementProject)],
                    aSort: [new Sorter("YearMth", false)]
                },
                {
                    oModel: this.getView().getModel("EmpWriteOffPostpone"),
                    sPath: "/YY1_EMP_WRITEOFF_POSTP_API",
                    aFilters: [new Filter("ProjectID", FilterOperator.EQ, oContextObj.EngagementProject)],
                    aSort: [new Sorter("YearMth", false)]
                },
                {
                    oModel: this.getView().getModel("YY1_PROJ_RES_DISTR_CDS"),
                    sPath: "/YY1_PROJ_RES_DISTR",
                    aFilters: [
                        new Filter("Project", FilterOperator.EQ, oContextObj.EngagementProject)
                    ],
                    aSort: [new Sorter("PersonWorkAgreement", false), new Sorter("YearMth", false)]
                }
            ];
        },
        /**
         * Update projec resource
         * @param {Object} Json model property for update request
         * @public
         */
        updateResource: function (Object) {
            Object.oModel.update(Object.sKey, Object.oPayload, Object.mParameters);
        },
        /**
         * Delete projec resource
         * @param {Object} Json model property for delete request
         * @public
         */
        deleteResource: function (object) {
            object.oModel.remove(object.sKey, {}, object.mParameters);
            // object.oModel.remove(object.sKey);
            // return new Promise(function (resolve, reject) {
            //     object.oModel.remove(object.sKey, {
            //         success: function (oResp) {
            //             resolve(oResp);
            //         }.bind(this),
            //         error: function (oErr) {
            //             reject(oErr);
            //         }.bind(this)
            //     })
            // }.bind(this));
        },
        /**
         * Fetch project resources
         * @param {Object} Json model property for read request
         * @public
         */
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
        batchChange: function (object) {
            return new Promise(function (resolve, reject) {
                object.oModel.submitChanges(Object.assign(object.mParameters, {
                    success: function (oResp, o) {
                        
                        if (!!this.getModel('message') && this.getModel('message').getData().some(o => o.type === "Error")) {
                            // MessageBox.error(this.getModel('message').getData().find(o => o.type === "Error").message);
                           
                            sap.ui.getCore().getMessageManager().removeAllMessages();
                            // this.getModel("detailView").setProperty("/busy", false);
                            resolve(JSON.parse(JSON.stringify(this.getModel('message'))));
                            return;
                        }
                        resolve(oResp);
                    }.bind(this),
                    error: function (oErr) {
                        
                        // object.oModel.setUseBatch(false);
                        // object.oDetailModel.setProperty("/busy", false);
                        reject(oErr);
                    }.bind(this)
                }));
            }.bind(this))
        },
        /**
         * @param {Object} Object to add for message manager
         * @public
         */
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