// @ts-nocheck
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"

    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     * @param {typeof sap.ui.model.json.JSONModel} JSONModel
     */
], function (Controller, JSONModel) {
    "use strict";

    return Controller.extend("com.devjero.forms.forms.controller.App", {
        onInit: function () {
            
            /* Instancio el modelo */
            const oModel=new JSONModel();
            oModel.loadData("./localService/mockdata/CustomerModel.json");

            /* Instancio la vista */
            this.oView=this.getView();
            this.oView.setModel(oModel);

        }
    });
});