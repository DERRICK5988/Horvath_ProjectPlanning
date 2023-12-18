sap.ui.define([
    "./BaseController",
    "../model/models",
    "../model/formatter",
    'sap/m/MessagePopover',
    'sap/m/MessagePopoverItem',
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/library",
], function (BaseController, models, formatter, MessagePopover, MessagePopoverItem, MessageBox, FormattedText, Filter, Sorter, FilterOperator, mobileLibrary) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;
    var formatter = formatter;
    return BaseController.extend("StaffingApp.horvath.controller.Detail", {

        /* =========================================================== */
        /* lifecycle methods                                           */
        /* =========================================================== */

        /**
         * Called when detail view is initantiated
         * @public
         */
        onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page is busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(models.getDetailModel.call(this), "detailView");
            this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
        },
        onExit: function () {
            this.getRouter().getRoute("list").detachPatternMatched(this._onObjectMatched, this);
            this.getRouter().getRoute("object").detachPatternMatched(this._onObjectMatched, this);
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */

        /**
         * @function Populate changed value into aChangedSPath for update later
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @param {{}} Detail Model
         * @public
         */
        onChange: function (oEvent, oDetailModel) {
            var oSource = oEvent.getSource(),
                sPath = oSource.getBindingContext("detailView").sPath,
                aChangedSPath = oEvent.getSource().getModel("detailView").getProperty("/aChangedSPath"),
                aInputStaffed = oEvent.getSource().getModel("detailView").getProperty("/aInputStaffed");

            oDetailModel.bUpdate = oEvent.getParameter("newValue") ? true : false;
            if (!oEvent.getParameter("newValue") && aChangedSPath.length > 0) {
                var indexObj = aChangedSPath.findIndex(object => object.sPath === sPath);
                aChangedSPath.splice(indexObj, 1);
            } else {
                var aChanged = aChangedSPath.filter(obj => obj.sPath === sPath);
                if (aChanged.length > 0) {
                    aChanged[0].value = oEvent.getParameter("newValue");
                } else {
                    aChangedSPath.push(Object.assign(oDetailModel, {
                        sPath: sPath,
                        value: oEvent.getParameter("newValue"),
                        inputId: oEvent.getParameter("id")
                    }));
                }
            }
            oEvent.getSource().getModel("detailView").refresh(true);
        },
        /**
         * Validate value input before save
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @public
         */
        onSave: function (oEvent) {
            var detailModel = oEvent.getSource().getModel("detailView");
            var selectedView = detailModel.getProperty("/selectedView");
            var increment = (selectedView === "DAY") ? 0.5 : 4;
            var message = new FormattedText("FormattedText_" + new Date().getTime(), {
                htmlText: this.getResourceBundle().getText("savedMessage", [selectedView])
            });

            /*Only allow to input value based on increment value, e.g 4, 8, 12... for Hour, 0.5, 1, 1.5... for Days */
            for (var index in detailModel.getProperty("/aChangedSPath")) {
                if (+detailModel.getProperty("/aChangedSPath")[index].value % increment !== 0) {
                    MessageBox.error(this.getResourceBundle().getText("errorHrDayText"));
                    return;
                }
            }
            MessageBox.confirm(message, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === "CANCEL") return;
                    this._request();
                }.bind(this)
            });
        },

        onSegmentChanged: function () {
            this.getModel("detailView").refresh(true);
        },
        /**
         * Navigate to employee detail page
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @param {{}} Detail Model
         * @public
         */
        onEmployeePress: function (oEvent, oDetailModel) {
            this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
            this.getModel("appView").setProperty("/layout", "EndColumnFullScreen");
            this.getOwnerComponent().getRouter().navTo("detailDetail", {
                object: encodeURIComponent(JSON.stringify(oDetailModel))
            });
        },
        /**
         * Set the full screen mode to false and navigate to list page
         * @public
         */
        onCloseDetailPress: function () {
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
            // No item should be selected on list after detail page is closed
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getRouter().navTo("list");
        },
        // onMessagesButtonPress: function (oEvent) {
        //     var oMessagesButton = oEvent.getSource();
        //     if (!this._messagePopover) {
        //         this._messagePopover = new MessagePopover({
        //             items: {
        //                 path: "message>/",
        //                 template: new MessagePopoverItem({
        //                     description: "{message>description}",
        //                     type: "{message>type}",
        //                     title: "{message>message}"
        //                 })
        //             }
        //         });
        //         oMessagesButton.addDependent(this._messagePopover);
        //     }
        //     this._messagePopover.toggle(oMessagesButton);
        // },
        /**
         * Toggle between full and non full screen mode.
         * @public
         */
        toggleFullScreen: function () {
            var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
            this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
            if (!bFullScreen) {
                // store current layout and go full screen
                this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
                this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
            } else {
                // reset to previous layout
                this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            }
        },
        /**
         * Collapse all tree node
         * @public
         */
        onCollapseAll: function () {
            this.byId("idTreeTable").collapseAll();
        },
        /**
         * Expand all tree node
         * @public
         */
        onExpandAll: function () {
            this.byId("idTreeTable").expandToLevel(3);
        },

        /* =========================================================== */
        /* begin: internal methods                                     */
        /* =========================================================== */

        /**
         * Binds the view to the object path and expands the aggregated line items.
         * Fetch resources
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: async function (oEvent) {
            var oArguments = oEvent.getParameter("arguments"),
                aChanged = this.getModel("detailView").getProperty("/aChangedSPath") || [];

            this.oContextObj = JSON.parse(decodeURIComponent(oArguments.object))
            sap.ui.getCore().getMessageManager().removeAllMessages();
            this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
            /* Clear last input field value from previous project before clearing aChangeSPath 
               Empty aChangedSPath, aTimeRecUpdate and aPlannedValueChanged */
            aChanged.forEach((oChangedSPath) => {
                sap.ui.getCore().byId(oChangedSPath.inputId).setValue('')
            });
            this.getModel("detailView").setData(Object.assign(this.getModel("detailView").getData(), this.oContextObj, {
                StartDate: new Date(this.oContextObj.StartDate),
                EndDate: new Date(this.oContextObj.EndDate),
                aChangedSPath: [],
                aDeletion: []
            }));
            this.getModel("detailView").setProperty("/busy", true);
            await this._fetchResources(this.oContextObj);
            this.getModel("detailView").setProperty("/busy", false);
        },
        /**
         * Fetch resources and bind into detailView model
         * @function
         * @param {Object} Context from arguments
         * @returns {Promise} The promisified resources
         * @private
         */
        _fetchResources: async function (oContextObj) {
            var oCurrPeriod = this.getCurrentPeriod();
            return new Promise((resolve, reject) => {
                Promise.all(this.getResourcePath(oContextObj, oCurrPeriod).map(resource => this.fetchResources(resource))).then(async function (oResp) {
                    var oTreeData = {
                            Node: []
                        },
                        oDetailModel = this.getModel("detailView"),
                        [, aEmpCapaciy, aProjEng, aProjAssignDistr, aTimeRec, aEmpWriteOffPost, aProjResDistr] = oResp.map(({
                            results
                        }) => results);
                    oDetailModel.setProperty("/resourcesCount", oResp[0].results.length);
                    // this.getModel("detailView").setProperty("/resource", {});
                    /* Workpackage level */
                    for (var wpIndex in oResp[0].results) {
                        var oWpItem = oResp[0].results[wpIndex],
                            nBaseLine = aProjEng.reduce((acc, curr) => {
                                if (curr.Version === "2" && curr.WorkPackage === oWpItem.WorkPackageID) {
                                    return acc + +curr.Quantity;
                                }
                                return acc;
                            }, 0);
                        oTreeData.Node.push({
                            Name: [oWpItem.WorkPackageName, oWpItem.WorkPackageID].join(" "),
                            Baseline: (nBaseLine > 0) ? nBaseLine : null,
                            bLink: false,
                            bInputVisible: false,
                            Node: []
                        });
                        if (aEmpCapaciy.length === 0) {
                            continue;
                        }
                        var aEmpCap = aEmpCapaciy.filter((Object) => {
                                if (Object.WorkPackage === oWpItem.WorkPackageID) {
                                    return Object;
                                }
                            }),
                            oWpNodeLine = oTreeData.Node[oTreeData.Node.length - 1],
                            aEmpNode = oWpNodeLine.Node,
                            aRemaingDays = await this.fetchResources({
                                oModel: this.getView().getModel("EmployeeCapacity"),
                                sPath: "/YY1_EMP_CAPACITY_API",
                                aFilters: aProjEng.filter(o => o.Version === '1').map(o => new Filter("PersonWorkAgreement", FilterOperator.EQ, o.PersonWorkAgreement)),
                                aSort: [new Sorter("EngagementProject", false), new Sorter("YearMth", false)]
                            });

                        /* Employee level */
                        for (var nEmpIdx in aEmpCap) {

                            var oEmpCapacity = aEmpCap[+nEmpIdx],
                                oTimeRec = aTimeRec.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.WorkPackageID === oWpItem.WorkPackageID && o.YearMth === oEmpCapacity.YearMth),
                                oProjAssignDistr = aProjAssignDistr.find(o => o.ProjectElement === oWpItem.WorkPackageID && o.ProjDmndRsceAssgmt === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                oProjResDistr = aProjResDistr.find(o => o.ProjectElement === oWpItem.WorkPackageID && o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                {
                                    ContractTypeName,
                                    ...restOfEmpCapacity
                                } = oEmpCapacity,
                                oEmpWriteOffPost = aEmpWriteOffPost.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth && o.WorkPackageID === oWpItem.WorkPackageID);

                            oWpNodeLine.ContractTypeName = oWpNodeLine.ContractTypeName || oEmpCapacity.ContractTypeName;
                            if (aEmpNode.length === 0 || !aEmpNode.some(i => i['WorkAgrementID'] === oEmpCapacity.PersonWorkAgreement)) {
                                var nEmpBaseLine = aProjEng.reduce((acc, curr) => {
                                    if (curr.Version === "2" && curr.WorkPackage === oWpItem.WorkPackageID && curr.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement) {
                                        return acc + +curr.Quantity;
                                    }
                                    return acc;
                                }, 0);
                                aEmpNode.push({
                                    ...restOfEmpCapacity,
                                    ...{
                                        WorkAgrementID: oEmpCapacity.PersonWorkAgreement,
                                        Name: oEmpCapacity.PersonFullName,
                                        Baseline: (nEmpBaseLine > 0) ? nEmpBaseLine : null,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    }
                                });
                            }

                            /* Employee distribution month */
                            var oEmpNodeLine = aEmpNode[aEmpNode.length - 1],
                                {
                                    ServiceCostLevelName,
                                    ContractTypeName,
                                    ...restOfEmpCapacity
                                } = oEmpCapacity;
                            /* Sum of previous month */
                            if (+oEmpCapacity.YearMth < oCurrPeriod.nMinMth) {
                                if (!oEmpNodeLine.Node.some((objP) => !!objP.preMth)) {
                                    oEmpNodeLine.Node.push({
                                        Name: this.getResourceBundle().getText("Sumofpreviousmonths"),
                                        preMth: true,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    });
                                }
                                /* Push time recording for update later. Set bTimeRecUpdate as update indicator
                                   Only previous month
                                   If time recording value same as Staffed then ignore */
                                // (oTimeRec && +oTimeRec.RecordedQuantity > 0 && +oTimeRec.RecordedQuantity !== +oEmpCapacity.PlndEffortQty && oProjAssignDistr) ? oDetailModel.getProperty("/aTimeRecUpdate").push({
                                //     ProjDmndRsceAssgmtDistrUUID: oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID,
                                //     value: oTimeRec.RecordedQuantity,
                                //     PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement,
                                //     YearMth: oEmpCapacity.YearMth
                                // }): "";
                                (oTimeRec && +oTimeRec.RecordedQuantity > 0 && +oTimeRec.RecordedQuantity !== +oEmpCapacity.PlndEffortQty && oProjAssignDistr) ?
                                oDetailModel.getProperty("/aChangedSPath").push(Object.assign(oEmpCapacity, oProjAssignDistr, oProjResDistr, {
                                    bTimeRecUpdate: true,
                                    value: oTimeRec.RecordedQuantity
                                })): "";

                                /* Push to deletion for those time recording is zero or no time rec and staffed value is > zero  */
                                ((!oTimeRec || +oTimeRec.RecordedQuantity === 0) && +oEmpCapacity.PlndEffortQty > 0 && oProjAssignDistr) ?
                                oDetailModel.getProperty("/aDeletion").push(Object.assign(oEmpCapacity, oProjAssignDistr, oProjResDistr)): "";
                                var preMthLines = oEmpNodeLine.Node.filter((i) => (i.preMth)),
                                    aEmpRemaingDays = aRemaingDays.results.filter(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                    aPreNode = preMthLines[0].Node;
                                // oEmpResDmdByMonth = aProjEng.find(o => o.WorkPackage === oWpItem.WorkPackageID && o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oEmpCapacity.YearMth);
                                // if (restOfEmpCapacity.PlndEffortQty > 0 && oEmpResDmdByMonth) {
                                //     oDetailModel.getProperty("/aPlannedValueChanged").push(Object.assign(oEmpResDmdByMonth, {
                                //         PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement,
                                //         Quantity: oEmpCapacity.PlndEffortQty,
                                //         YearMth: oEmpCapacity.YearMth
                                //     }));
                                // }
                                aPreNode.push(this._returnMthDist({
                                    ...restOfEmpCapacity,
                                    Level: oEmpCapacity.ServiceCostLevelName,
                                    ...(oTimeRec ? oTimeRec : ""),
                                    ...{
                                        bLink: false,
                                        bInputVisible: false,
                                        ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "",
                                        ProjDmndRsceReqDistrUUID: (oProjResDistr) ? oProjResDistr.ProjDmndRsceReqDistrUUID : "",
                                        WriteOffs: (oEmpWriteOffPost) ? oEmpWriteOffPost.WrittenOffQuantity : null,
                                        aEmpRemaingDays: aEmpRemaingDays
                                    },
                                    aProjEng: aProjEng,
                                    preMth: true
                                }));
                                this._calculateValues(preMthLines[0]);
                            } else {
                                /* Sum of upcoming month */
                                if (!oEmpNodeLine.Node.some((objUp) => !!objUp.upcomMth)) {
                                    oEmpNodeLine.Node.push({
                                        Name: this.getResourceBundle().getText("Sumofupcomingmonths"),
                                        upcomMth: true,
                                        bLink: false,
                                        bInputVisible: false,
                                        Node: []
                                    });
                                }
                                var upComMthLines = oEmpNodeLine.Node.filter((i) => (i.upcomMth)),
                                    aEmpRemaingDays = aRemaingDays.results.filter(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                    aUpcomNode = upComMthLines[0].Node,
                                    oEmpResDmdByMonth = aProjEng.find(o => o.WorkPackage === oWpItem.WorkPackageID && o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oEmpCapacity.YearMth);
                                // if (restOfEmpCapacity.PlndEffortQty > 0 && oEmpResDmdByMonth) {
                                //     oDetailModel.getProperty("/aPlannedValueChanged").push(Object.assign(oEmpResDmdByMonth, {
                                //         PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement,
                                //         Quantity: oEmpCapacity.PlndEffortQty,
                                //         YearMth: oEmpCapacity.YearMth
                                //     }));
                                // }
                                aUpcomNode.push(this._returnMthDist({
                                    ...restOfEmpCapacity,
                                    Level: oEmpCapacity.ServiceCostLevelName,
                                    ...(oTimeRec ? oTimeRec : ""),
                                    ...{
                                        nStaffedNew: +oEmpCapacity.PlndEffortQty,
                                        bLink: true,
                                        bInputVisible: true,
                                        ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "",
                                        ProjDmndRsceReqDistrUUID: (oProjResDistr) ? oProjResDistr.ProjDmndRsceReqDistrUUID : "",
                                        WriteOffs: (oEmpWriteOffPost) ? oEmpWriteOffPost.WrittenOffQuantity : null,
                                        aEmpRemaingDays: aEmpRemaingDays,
                                        aProjEng: aProjEng,
                                        preMth: false
                                    }
                                }));
                                this._calculateValues(upComMthLines[0]);
                            }
                            this._calculateValues(oEmpNodeLine);
                        }
                        /* Calculate Employe's KPI */
                        for (var iEmpIndx in oWpNodeLine.Node) {
                            var oEmpNode = oWpNodeLine.Node[iEmpIndx];
                            oEmpNode = Object.assign(oEmpNode, {
                                EstTillCompletion: +oEmpNode.Staffed - +oEmpNode.TimeRecordings,
                                EstAtCompletion: +oEmpNode.Staffed,
                                DeltaELPlanned: +oEmpNode.Staffed - +oEmpNode.Baseline
                            });
                        }
                        this._calculateValues(oWpNodeLine);
                        oWpNodeLine = Object.assign(oWpNodeLine, {
                            EstTillCompletion: +oWpNodeLine.Staffed - +oWpNodeLine.TimeRecordings,
                            EstAtCompletion: +oWpNodeLine.Staffed,
                            DeltaELPlanned: +oWpNodeLine.Staffed - +oWpNodeLine.Baseline
                        });
                    }
                    this.getModel("detailView").setProperty("/totalUnassignCap", oTreeData.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0));
                    this.getModel("detailView").setProperty("/resource", oTreeData);
                    // this.getModel("detailView").setProperty("/busy", false);
                    this.getModel("detailView").refresh(true);
                    resolve(this.getModel("detailView").getProperty("/resource"));
                }.bind(this)).catch(function (oErr) {
                    this.getModel("detailView").setProperty("/busy", false);
                    reject(oErr);
                }.bind(this));
            });
        },
        _onMetadataLoaded: function () {},
        /**
         * Refresh csrf token
         * @param {Object} Dynamic model
         * @returns {Promise} The promisified csrf token
         * @private
         */
        _fetchCsrfToken: function (oModel) {
            return new Promise((resolve, reject) => {
                try {
                    oModel.refreshSecurityToken(function (oResp) {
                        resolve(oModel.getSecurityToken());
                    }.bind(this));
                } catch (oError) {
                    this.getModel("detailView").setProperty("/busy", false);
                    reject(oError);
                }
            })
        },
        /**
         * Update saved value from aChangedSPath and delete previous month from aDeletion
         * @private
         */
        _request: async function () {
            this.getModel("detailView").setProperty("/busy", false);
            var oProjDmdModel = this.getModel("ProjectDemand"),
                oDetailModel = this.getModel("detailView"),
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath"),
                aDeletion = oDetailModel.getProperty("/aDeletion"),
                object = {};

            // if (aChangedSPath.length === 0 && aTimeRecUpdate.length === 0 && aPlannedValueChanged.length === 0) {
            if (aChangedSPath.length === 0 && aDeletion.length === 0) {
                return;
            }
            this.getModel("detailView").setProperty("/busy", true);
            oProjDmdModel.attachBatchRequestCompleted(this._batchRequestCompleted, this);
            this.csrfToken = await this._fetchCsrfToken(oProjDmdModel);
            if (aDeletion.length > 0) {
                object.mParameters = {
                    groupId: "BatchDelete",
                    changeSetId: "changeSetId1",
                    headers: {
                        "X-CSRF-Token": this.csrfToken
                    }
                };
                oProjDmdModel.setDeferredGroups(["BatchDelete"]);
                object.oModel = oProjDmdModel;
                for (var index in aDeletion) {
                    var oContext = aDeletion[index];
                    /*Delete staffed effort*/
                    object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                        ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                    });
                    this.deleteResource.call(this, object);
                    /*Delete planned effort*/
                    if (oContext.ProjDmndRsceReqDistrUUID) {
                        object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceReqDistribution", {
                            ProjDmndRsceReqDistrUUID: oContext.ProjDmndRsceReqDistrUUID
                        });
                        this.deleteResource.call(this, object);
                    }
                }
                await this.batchChange({
                    oModel: oProjDmdModel,
                    mParameters: {
                        groupId: "BatchDelete"
                    }
                });
            } else if (aChangedSPath.length > 0) {
                this._updateRequest();
            }
        },
        /**
         * Fire when batch run is completed regardless success or not
         * Refresh data by calling this._fetchResources
         * @private
         */
        _batchRequestCompleted: async function (oEvent) {
            var oProjDmdModel = this.getModel("ProjectDemand");

            if (oEvent.getSource().getDeferredGroups()[0] === "BatchDelete") {
                this._updateRequest();
            } else if (oEvent.getSource().getDeferredGroups()[0] === "BatchUpdate") {
                oProjDmdModel.detachBatchRequestCompleted(this._batchRequestCompleted, this);
                var oMessageModel = this.getModel("message"),
                    oMessageData = oMessageModel.getData()[oMessageModel.getData().length - 1],
                    aChangedSPath = this.getModel("detailView").getProperty("/aChangedSPath"),
                    bSuccess = oEvent.getParameters().success;

                for (var index in aChangedSPath) {
                    var oChangedSPath = aChangedSPath[index];
                    if (!oChangedSPath.bTimeRecUpdate) {
                        sap.ui.getCore().byId(oChangedSPath.inputId).setValue('');
                    }
                }
                this.getModel("detailView").setProperty("/aChangedSPath", []);
                this.getModel("detailView").setProperty("/aDeletion", [])
                /* Re-fetch resource to display updated resource */
                await this._fetchResources(this.oContextObj);
                this.getView().getModel("detailView").refresh(true);
                if (bSuccess) {
                    MessageBox.success("Record saved");
                } else {
                    MessageBox.error("Failed to update");
                }
                this.getModel("detailView").setProperty("/busy", false);
            }
        },
        /**
         * @private
         */
        _updateRequest: async function () {
            var oProjDmdModel = this.getModel("ProjectDemand"),
                oDetailModel = this.getModel("detailView"),
                object = {},
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath");

            object.mParameters = {
                groupId: "BatchUpdate",
                changeSetId: "changeSetId2",
                headers: {
                    "X-CSRF-Token": this.csrfToken
                }
            };
            object.oModel = oProjDmdModel;
            oProjDmdModel.setDeferredGroups(["BatchUpdate"]);
            for (var index in aChangedSPath) {
                var oContext = aChangedSPath[index],
                    /* No required to convert day/hr for time rec since the value is already in hour */
                    sStaffedEffort = (oDetailModel.getProperty("/selectedView") === "DAY" && !oContext.bTimeRecUpdate) ? Math.round(oContext.value * 8).toString() : oContext.value.toString();

                object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: sStaffedEffort
                };
                this.updateResource(object);
                /* Time rec not required to update planned value */
                if (!oContext.bTimeRecUpdate) {
                    object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceReqDistribution", {
                        ProjDmndRsceReqDistrUUID: oContext.ProjDmndRsceReqDistrUUID
                    });
                    object.oPayload = {
                        ProjDmndRsceReqDistrQuantity: sStaffedEffort
                    };
                    this.updateResource(object);
                }
            };
            await this.batchChange({
                oModel: oProjDmdModel,
                mParameters: {
                    groupId: "BatchUpdate"
                }
            });
        },
        /**
         * Caluclation for monthly distribution
         * @param {Object}
         * @private
         */
        _returnMthDist: function (Object) {
            var nStaffedEffort = +Object.aEmpRemaingDays.reduce((sum, current) => sum + +current.PlndEffortQty, 0);
            // nAssignedCap = +Object.AvailabilityInHours - +Object.AbsenceInHours - nStaffedEffort;
            return {
                ...Object,
                ...{
                    WorkPackage: Object.WorkPackage,
                    Name: this.formatter.returnDataFormat("MMM yyyy").format(new Date([Object.YearMth.substr(0, 4), Object.YearMth.substr(4, 2), "01"].join("-"))),
                    YearMth: Object.YearMth,
                    TimeRecordings: (+Object.RecordedQuantity > 0) ? +Object.RecordedQuantity : null,
                    Staffed: +Object.PlndEffortQty,
                    // UnassignedCap: nAssignedCap,
                    // UnassignedCap: (!Object.preMth) ? +Object.AvailabilityInHours - +Object.AbsenceInHours - nStaffedEffort : null,
                    UnassignedCap: (!Object.preMth) ? +Object.AvailabilityInHours - nStaffedEffort : null,
                    Writeoffs: Object.WriteOffs,
                    bLink: Object.bLink,
                    bInputVisible: Object.bInputVisible,
                    nProjectAssigned: nStaffedEffort
                }
            }
        },
        /**
         * Sum each of the node
         * @private
         */
        _calculateValues: function (nodeLine) {
            nodeLine.Staffed = nodeLine.Node.map((o) => o.Staffed).reduce((prev, curr) => +prev + +curr, 0) || null;
            nodeLine.TimeRecordings = nodeLine.Node.map((o) => o.TimeRecordings).reduce((prev, curr) => +prev + +curr, 0) || null;
            nodeLine.UnassignedCap = nodeLine.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0);
            nodeLine.Writeoffs = nodeLine.Node.map((o) => o.Writeoffs).reduce((prev, curr) => +prev + +curr, 0) || null;
        }
    });
});