sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    'sap/m/MessagePopover',
    'sap/m/MessagePopoverItem',
    "sap/m/MessageBox",
    "sap/m/FormattedText",
    "sap/ui/model/Filter",
    "sap/ui/model/Sorter",
    "sap/ui/model/FilterOperator",
    "sap/m/library",
], function (BaseController, JSONModel, MessagePopover, MessagePopoverItem, MessageBox, FormattedText, Filter, Sorter, FilterOperator, mobileLibrary) {
    "use strict";

    // shortcut for sap.m.URLHelper
    var URLHelper = mobileLibrary.URLHelper;
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
            var oViewModel = new JSONModel({
                resourcesCount: 0,
                busy: false,
                delay: 0,
                lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading"),
                btnVisible: true,
                aInputStaffed: [],
                totalUnassignCap: 0,
                selectedView: "DAY"
            });
            this.getView().setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
            sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "detailView");
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

            if (!oEvent.getParameter("newValue") && aChangedSPath.length > 0) {
                var indexObj = aChangedSPath.findIndex(object => object.sPath === sPath);
                aChangedSPath.splice(indexObj, 1);
            } else {
                var aChanged = aChangedSPath.filter(obj => obj.sPath === sPath);
                if (aChanged.length > 0) {
                    aChanged[0].value = oEvent.getParameter("newValue");
                } else {
                    aChangedSPath.push(Object.assign(oDetailModel, { sPath: sPath, value: oEvent.getParameter("newValue"), inputId: oEvent.getParameter("id") }));
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
            var message = new FormattedText("FormattedText_" + new Date().getTime(), { htmlText: this.getResourceBundle().getText("savedMessage", [selectedView]) });

            /*Only allow to input value based on increment value, e.g 4, 8, 12... for Hour, 0.5, 1, 1.5... for Days */
            for (var index in detailModel.getProperty("/aChangedSPath")) {
                if (+detailModel.getProperty("/aChangedSPath")[index].value % increment !== 0) {
                    // this.addMessageManager({ message: this.getResourceBundle().getText("errorHrDayText"), type: "Error" });
                    MessageBox.error(this.getResourceBundle().getText("errorHrDayText"));
                    return;
                }
            }
            MessageBox.confirm(message, {
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction === "CANCEL") return;
                    this._updateModel();
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
            // this.getOwnerComponent().oListSelector.clearListListSelection();
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
            /* Clear last input field value from previous project before clearing aChangePath 
               Empty aChangedSPath, aTimeRecUpdate and aPlannedValueChanged */
            aChanged.forEach((oChangedSPath) => { sap.ui.getCore().byId(oChangedSPath.inputId).setValue('') });
            this.getModel("detailView").setData(Object.assign(this.getModel("detailView").getData(), this.oContextObj, {
                StartDate: new Date(this.oContextObj.StartDate),
                EndDate: new Date(this.oContextObj.EndDate),
                aChangedSPath: [],
                aTimeRecUpdate: [],
                aPlannedValueChanged: []
            }));
            this.getModel("detailView").setProperty("/busy", true);
            await this._fetchResources(this.oContextObj);
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
                    var oTreeData = { Node: [] },
                        oDetailModel = this.getModel("detailView"),
                        [, aEmpCapaciy, aProjEng, aProjAssignDistr, aTimeRec, aEmpWriteOffPost] = oResp.map(({ results }) => results);

                    oDetailModel.setProperty("/resourcesCount", oResp[0].results.length);
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
                            var oEmpCapacity = aEmpCap[nEmpIdx],
                                oTimeRec = aTimeRec.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                oProjAssignDistr = aProjAssignDistr.find(o => o.ProjDmndRsceAssgmt === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                { ContractTypeName, ...restOfEmpCapacity } = oEmpCapacity,
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
                                    ...restOfEmpCapacity, ...{
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
                                { ServiceCostLevelName, ContractTypeName, ...restOfEmpCapacity } = oEmpCapacity;
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
                                /* Push time recording into aTimeRecUpdate for update later
                                   Only previous month
                                   If time recording value same as Staffed then ignore */
                                (oTimeRec && +oTimeRec.RecordedQuantity > 0 && +oTimeRec.RecordedQuantity !== +oEmpCapacity.PlndEffortQty && oProjAssignDistr) ? oDetailModel.getProperty("/aTimeRecUpdate").push({
                                    ProjDmndRsceAssgmtDistrUUID: oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID,
                                    value: oTimeRec.RecordedQuantity,
                                    PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement,
                                    YearMth: oEmpCapacity.YearMth
                                }) : "";
                                var preMthLines = oEmpNodeLine.Node.filter((i) => (i.preMth)),
                                    aEmpRemaingDays = aRemaingDays.results.filter(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.YearMth === oEmpCapacity.YearMth),
                                    aPreNode = preMthLines[0].Node,
                                    oEmpResDmdByMonth = aProjEng.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oEmpCapacity.YearMth);

                                if (restOfEmpCapacity.PlndEffortQty > 0) {
                                    oDetailModel.getProperty("/aPlannedValueChanged").push(Object.assign(oEmpResDmdByMonth, { PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement, Quantity: oEmpCapacity.PlndEffortQty, YearMth: oEmpCapacity.YearMth }));
                                }
                                aPreNode.push(this._returnMthDist({ ...restOfEmpCapacity, Level: oEmpCapacity.ServiceCostLevelName, ...(oTimeRec ? oTimeRec : ""), ...{ bLink: false, bInputVisible: false, ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "", WriteOffs: (oEmpWriteOffPost) ? oEmpWriteOffPost.WrittenOffQuantity : null, aEmpRemaingDays: aEmpRemaingDays }, aProjEng: aProjEng, preMth: true }));
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
                                    oEmpResDmdByMonth = aProjEng.find(o => o.PersonWorkAgreement === oEmpCapacity.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oEmpCapacity.YearMth);
                                if (restOfEmpCapacity.PlndEffortQty > 0) {
                                    oDetailModel.getProperty("/aPlannedValueChanged").push(Object.assign(oEmpResDmdByMonth, { PersonWorkAgreement: oEmpCapacity.PersonWorkAgreement, Quantity: oEmpCapacity.PlndEffortQty, YearMth: oEmpCapacity.YearMth }));
                                }
                                aUpcomNode.push(this._returnMthDist({ ...restOfEmpCapacity, Level: oEmpCapacity.ServiceCostLevelName, ...(oTimeRec ? oTimeRec : ""), ...{ nStaffedNew: +oEmpCapacity.PlndEffortQty, bLink: true, bInputVisible: true, ProjDmndRsceAssgmtDistrUUID: (oProjAssignDistr) ? oProjAssignDistr.ProjDmndRsceAssgmtDistrUUID : "", WriteOffs: (oEmpWriteOffPost) ? oEmpWriteOffPost.WrittenOffQuantity : null, aEmpRemaingDays: aEmpRemaingDays, aProjEng: aProjEng, preMth: false } }));
                                this._calculateValues(upComMthLines[0]);
                            }
                            this._calculateValues(oEmpNodeLine);
                        }
                        /* Calculate Employe's KPI */
                        for (var iEmpIndx in oWpNodeLine.Node) {
                            var oEmpNode = oWpNodeLine.Node[iEmpIndx];
                            oEmpNode = Object.assign(oEmpNode, { EstTillCompletion: +oEmpNode.Staffed - +oEmpNode.TimeRecordings, EstAtCompletion: +oEmpNode.Staffed, DeltaELPlanned: +oEmpNode.Staffed - +oEmpNode.Baseline });
                        }
                        this._calculateValues(oWpNodeLine);
                        oWpNodeLine = Object.assign(oWpNodeLine, { EstTillCompletion: +oWpNodeLine.Staffed - +oWpNodeLine.TimeRecordings, EstAtCompletion: +oWpNodeLine.Staffed, DeltaELPlanned: +oWpNodeLine.Staffed - +oWpNodeLine.Baseline });
                    }
                    this.getModel("detailView").setProperty("/totalUnassignCap", oTreeData.Node.map((o) => o.UnassignedCap).reduce((prev, curr) => +prev + +curr, 0));
                    this.getModel("detailView").setProperty("/resource", oTreeData);
                    this.getModel("detailView").refresh(true);
                    this.getModel("detailView").setProperty("/busy", false);
                    resolve(this.getModel("detailView").getProperty("/resource"));
                }.bind(this)).catch(function (oErr) {
                    this.getModel("detailView").setProperty("/busy", false);
                    reject(oErr);
                }.bind(this));
            });
        },
        _onMetadataLoaded: function () { },
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
        * Update saved value from aChangedSPath/ aTimeRecUpdate/ aPlannedValueChanged [detailView model]
        * @private
        */
        _updateModel: async function () {
            this.getModel("detailView").setProperty("/busy", false);
            var oProjDmdModel = this.getModel("ProjectDemand"),
                oProjEngmtUpdModel = this.getModel("PROJ_ENGMT_UPDATE_SRV"),
                oDetailModel = this.getModel("detailView"),
                aChangedSPath = oDetailModel.getProperty("/aChangedSPath"),
                aTimeRecUpdate = oDetailModel.getProperty("/aTimeRecUpdate"),
                aPlannedValueChanged = oDetailModel.getProperty("/aPlannedValueChanged"),
                object = {};

            if (aChangedSPath.length === 0 && aTimeRecUpdate.length === 0 && aPlannedValueChanged.length === 0) {
                return;
            }
            this.getModel("detailView").setProperty("/busy", true);
            /************************************************ */
            // oProjDmdModel.setUseBatch(true);
            // oProjDmdModel.setDeferredGroups(["BatchQuery"]);
            // oProjEngmtUpdModel.setUseBatch(true);
            // oProjEngmtUpdModel.setDeferredGroups(["BatchQuery"]);
            // var object = {
            //     oModel: oProjDmdModel,
            //     mParameters: { groupId: "BatchQuery", changeSetId: "changeSet_" + new Date().getTime(), method: "PATCH", headers: { "X-CSRF-Token": await this._fetchCsrfToken(this.getModel("ProjectDemand")) } },
            //     sProperty: "/aChangedSPath",
            //     sKeyPath: "/A_ProjDmndRsceAssgmtDistr"
            // };
            // this._batchRun(object);
            // object.sProperty = "/aTimeRecUpdate";
            // this._batchRun(object);
            // var oProjDmdUpd = await this.batchChange(object);
            // object = Object.assign(object, { oModel: oProjEngmtUpdModel, sProperty: "/aPlannedValueChanged", mParameters: Object.assign({ changeSetId: "changeSet_" + new Date().getTime() }), sKeyPath: "/A_EngmntProjRsceDmndDistr" })
            // this._batchRun(object);
            // var oProjEngmtUpd = await this.batchChange(object);
            /************************************************ */
            oProjDmdModel.setUseBatch(true);
            oProjDmdModel.setDeferredGroups(["BatchQuery"]);
            oProjEngmtUpdModel.setUseBatch(true);
            oProjEngmtUpdModel.setDeferredGroups(["BatchQuery"]);
            object.oDetailModel = oDetailModel;
            object.mParameters = {
                groupId: "BatchQuery",
                method: "PATCH",
                headers: { "X-CSRF-Token": await this._fetchCsrfToken(oProjDmdModel) }
            };
            object.oModel = oProjDmdModel;
            /* Updating staffed value */
            for (var index in aChangedSPath) {
                var oContext = aChangedSPath[index],
                    oEmpResDmdByMonth = oContext.aProjEng.find(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oContext.YearMth),
                    sStaffedEffort = (oDetailModel.getProperty("/selectedView") === "DAY") ? Math.round(oContext.value * 8).toString() : oContext.value.toString();

                if (aPlannedValueChanged.length > 0 && !!aPlannedValueChanged.some(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.YearMth === oContext.YearMth)) {
                    var oPlannedValueChanged = aPlannedValueChanged.find(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.YearMth === oContext.YearMth);
                    oPlannedValueChanged.Quantity = sStaffedEffort;
                } else {
                    aPlannedValueChanged.push(Object.assign(oEmpResDmdByMonth, { PersonWorkAgreement: oContext.PersonWorkAgreement, Quantity: sStaffedEffort, YearMth: oContext.YearMth }));
                }
                object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: sStaffedEffort
                };
                /* Generate new changeSet avoid same request crash */
                object.mParameters.changeSetId = "changeSet_" + new Date().getTime();
                this.updateResource(object);
            };
            /* Overwriting staffed value from time recording
               Only application for previous month */
            for (var index in aTimeRecUpdate) {
                var oContext = aTimeRecUpdate[index];
                object.sKey = oProjDmdModel.createKey("/A_ProjDmndRsceAssgmtDistr", {
                    ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID
                });
                /* Time Recording not required to convert hour/day because the value is already in hour */
                object.oPayload = {
                    ProjDmndRsceAssgmtDistrQty: oContext.value.toString()
                };
                object.mParameters.changeSetId = "changeSet_" + new Date().getTime();
                this.updateResource(object);
            };
            var oProjDmdUpd = await this.batchChange(object);
            object.oModel = oProjEngmtUpdModel;
            /* Updating planned value */
            for (var index in aPlannedValueChanged) {
                var oContext = aPlannedValueChanged[index];
                object.sKey = oProjEngmtUpdModel.createKey("/A_EngmntProjRsceDmndDistr", {
                    WorkPackage: oContext.WorkPackage,
                    ResourceDemand: oContext.ResourceDemand,
                    Version: oContext.Version,
                    CalendarMonth: oContext.CalendarMonth.toString().padStart(3, '0'),
                    CalendarYear: oContext.CalendarYear
                });
                object.oPayload = {
                    UnitOfMeasure: 'H',
                    Quantity: oContext.Quantity
                };
                object.mParameters.changeSetId = "changeSet_" + new Date().getTime();
                this.updateResource(object);
            };
            var oProjEngmtUpd = await this.batchChange(object);
            /* Promisified batch update */
            Promise.all([oProjDmdUpd, oProjEngmtUpd]).then(async function (oResp) {
                var oMessageModel = this.getModel("message"),
                    oMessageData = oMessageModel.getData()[oMessageModel.getData().length - 1],
                    aChangedSPath = this.getModel("detailView").getProperty("/aChangedSPath");

                // this.addMessageManager({ message: this.getResourceBundle().getText("UpdateSuccessMsg", +(aChangedSPath.length + aTimeRecUpdate.length)), type: sap.ui.core.MessageType.Success });
                aChangedSPath.forEach(function (oChangedSPath) {
                    sap.ui.getCore().byId(oChangedSPath.inputId).setValue('');
                });
                this.getModel("detailView").setProperty("/aChangedSPath", []);
                this.getModel("detailView").setProperty("/aTimeRecUpdate", [])
                this.getModel("detailView").setProperty("/aPlannedValueChanged", [])
                this.getModel("ProjectDemand").setUseBatch(false);
                this.getModel("PROJ_ENGMT_UPDATE_SRV").setUseBatch(false);
                /* Re-fetch resource to display updated resource */
                await this._fetchResources(this.oContextObj);
                this.getModel("detailView").refresh(true);
                MessageBox.success(oMessageData.message);
            }.bind(this)).catch(function (oErr) {
                for (var idx in aChangedSPath) {
                    this.getModel("ProjectDemand").resetChanges([aChangedSPath[idx].sPath], true);
                }
                this.getModel("ProjectDemand").setUseBatch(false);
                this.getModel("PROJ_ENGMT_UPDATE_SRV").setUseBatch(false);
                this.getModel("detailView").setProperty("/busy", false);
            }.bind(this));
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
                ...Object, ...{
                    WorkPackage: Object.WorkPackage,
                    Name: this.formatter.returnDataFormat("MMM yyyy").format(new Date([Object.YearMth.substr(0, 4), Object.YearMth.substr(4, 2), "01"].join("-"))),
                    YearMth: Object.YearMth,
                    TimeRecordings: (+Object.RecordedQuantity > 0) ? +Object.RecordedQuantity : null,
                    Staffed: +Object.PlndEffortQty,
                    // UnassignedCap: nAssignedCap,
                    UnassignedCap: (!Object.preMth) ? +Object.AvailabilityInHours - +Object.AbsenceInHours - nStaffedEffort : null,
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
        },
        /* Modulize update resource logic
           ** Not in use at the moment
        */
        _batchRun: function (object) {
            // if (!object.oModel.bUseBatch) {
            //     object.oModel.setUseBatch(true);
            //     object.oModel.setDeferredGroups(["BatchQuery"]);
            // }
            var aStaffUpd = this.getModel("detailView").getProperty(object.sProperty),
                aPlannedUpd = (object.sProperty !== "/aPlannedValueChanged") ? this.getModel("detailView").getProperty("/aPlannedValueChanged") : undefined;
            for (var index in aStaffUpd) {
                var oContext = aStaffUpd[index];

                if (object.sProperty === "/aChangedSPath") {
                    var oEmpResDmdByMonth = oContext.aProjEng.find(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.Version === '1').to_ResourceDemand.to_ResourceDemandDistribution.results.find(o => (o.CalendarYear + o.CalendarMonth.padStart(2, '0')) === oContext.YearMth),
                        sStaffedEffort = (this.getModel("detailView").getProperty("/selectedView") === "DAY" && object.sProperty === "/aChangedSPath") ? Math.round(oContext.value * 8).toString() : oContext.value.toString();
                    if (aPlannedUpd.length > 0 && !!aPlannedUpd.some(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.YearMth === oContext.YearMth)) {
                        var oPlannedValueChanged = aPlannedUpd.find(o => o.PersonWorkAgreement === oContext.PersonWorkAgreement && o.YearMth === oContext.YearMth);
                        oPlannedValueChanged.Quantity = sStaffedEffort;
                    } else {
                        aPlannedUpd.push(Object.assign(oEmpResDmdByMonth, { PersonWorkAgreement: oContext.PersonWorkAgreement, Quantity: sStaffedEffort, YearMth: oContext.YearMth }));
                    }
                }
                if (object.sProperty === "/aChangedSPath" || object.sProperty === "/aTimeRecUpdate") {
                    object.sKey = object.oModel.createKey(object.sKeyPath, { ProjDmndRsceAssgmtDistrUUID: oContext.ProjDmndRsceAssgmtDistrUUID });
                    object.oPayload = {
                        ProjDmndRsceAssgmtDistrQty: sStaffedEffort
                    };
                } else {
                    object.sKey = object.oModel.createKey(object.sKeyPath, {
                        WorkPackage: oContext.WorkPackage,
                        ResourceDemand: oContext.ResourceDemand,
                        Version: oContext.Version,
                        CalendarMonth: oContext.CalendarMonth.toString().padStart(3, '0'),
                        CalendarYear: oContext.CalendarYear
                    });
                    object.oPayload = {
                        UnitOfMeasure: 'H',
                        Quantity: oContext.Quantity
                    };
                }
                this.updateResource(object);
            };
        }
    });
});