// @ts-nocheck
// Se desactiva el chequeo de TypeScript porque UI5 usa patrones dinámicos

sap.ui.define([
    // Controlador base de UI5
    "sap/ui/core/mvc/Controller",

    // Modelo JSON para cargar datos locales
    "sap/ui/model/json/JSONModel",

    // Core de UI5 (para acceder al MessageManager)
    "sap/ui/core/Core",

    // Componentes para manejar mensajes
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/core/Element"

    //Los parametros de la funcion deben estar en el mismo orden en que los definí antes
], function (
    Controller,
    JSONModel,
    Core,
    MessagePopover,
    MessageItem,
    Element
) {
    "use strict";

    return Controller.extend("com.devjero.forms.forms.controller.App", {

        /**
         * Método de ciclo de vida
         * Se ejecuta cuando la vista se crea
         */
        onInit: function () {

            // =========================
            // MODELO DE DATOS
            // =========================

            // Se crea el modelo JSON vacio
            const oModel = new JSONModel();

            // Se cargan los datos desde el JSON local
            oModel.loadData("./localService/mockdata/CustomerModel.json");

            // Se inistancia y se obtiene la vista asociada al controlador (la vista que creó al controlador)
            this.oView = this.getView();

            // Se asigna el modelo a la vista (la vista ahora conoce al modelo, y puede traer datos de el usando biding en el XML: value="{/forms/0/name}")
            this.oView.setModel(oModel);



            // =========================
            // MESSAGE MANAGER
            // =========================

            // Se obtiene el MessageManager global de UI5 para centralizar errores, warning, validaciones, etc.
            this._MessageManager = Core.getMessageManager();

            // Se eliminan mensajes anteriores (por seguridad)
            this._MessageManager.removeAllMessages();

            // Se registra el contenedor del formulario de la vista en el MessageManager
            // Esto permite que UI5 detecte errores en ese contenedor
            //Con true registra los hijos (Inputs, Selects, etc.)
            this._MessageManager.registerObject(
                this.oView.byId("vbPersonal"),
                true
            );

            // Se asigna el modelo de mensajes a la vista
            // Es como decirle "Vista, acá te dejo el modelo (MessageManager) donde UI5 guarda todos los errores y mensajes, renombrado a "message" ”
            this.oView.setModel(
                this._MessageManager.getMessageModel(),
                "message"
            );

            // Se crea el MessagePopover: Componente visual donde se van a mostrar los mensajes (todavía sin mostrarlo)
            this.createMessagePopover();

            //La app arranca → se crea la vista → se inicializa el controller → se carga el JSON → 
            // se asigna el modelo → se configura el MessageManager → 
            // la vista queda lista para mostrar datos y validar errores
        },





        /*
        Crea el MessagePopover que mostrará errores y advertencias
        Método que crea una ventana flotante (MessagePopover) que:
            1. Lee los mensajes del sistema (MessageManager)
            2. Los muestra en una lista
            3. Cuando se hace click en uno, te lleve al campo con error
        */
        createMessagePopover: function () {

            // Guardo el controller para poder usarlo dentro de callbacks
            const oController = this;

            // Se instancia el MessagePopover y se guarda en el controller (this.oMP)
            this.oMP = new MessagePopover({


            //Evento que se dispara al hacer click en un mensaje de error:
                activeTitlePress: function (oEvent) {

                    // Se obtiene el item presionado (oItem = una fila del MessagePopover)
                    const oItem = oEvent.getParameter("item");

                    // Página principal para poder scrollear
                    const oPage = oController.getView().byId("pageMain");

                    // Se obtiene el mensaje desde el modelo "message" (Con el controlId recuperamos el Input exacto que falló.)
                    const oMessage = oItem
                        .getBindingContext("message")
                        .getObject();

                    // Se obtiene el control asociado al mensaje (Con el controlId recuperamos el Input exacto que falló)
                    const oControl = Element.registry.get(
                        oMessage.getControlId()
                    );

                    // Si existe el control, se hace scroll hasta él
                    if (oControl) {
                        oPage.scrollToElement(
                            oControl.getDomRef(),
                            200,
                            [0, -100]
                        );

                        // Se enfoca el campo del control luego del scroll
                        setTimeout(function () {
                            oControl.focus();
                        }, 300);
                    }
                },

                //De acá salen los mensajes (del modelo de mensajes: MessageManager)
                items: {
                    path: "message>/",
                    template: new MessageItem({ //Define cómo se muestra cada mensaje
                        title: "{message>message}",
                        subtitle: "{message>additionalText}",
                        groupName : {parts : [{path : 'message>controlIds'}], formatter : this.getGroupName},
                        activeTitle : {parts : [{path : 'message>controlIds'}], formatter : this.isPositionable},
                        type: { //Convierto Sting a Enum (porque el modelo trae "Error" como String, y UI5 espera un enum)
                            path: "message>type",
                            formatter: function (sType) {
                                return sap.ui.core.message.MessageType[sType] || sap.ui.core.message.MessageType.None;
                            }
                        },

                        description : "{message>message}"
                    })
                },
                //agrupa los mensajes
                groupItems : true
            });

            // Se agrega el popover como dependiente de la vista
            this.getView()
                .byId("messagePopover")
                .addDependent(this.oMP);
        },





        //Uso esta funcion para agrupar mensajes en el MessagePopover
        getGroupName : function(sControlId) {
            let oControl=Element.registry.get(sControlId);

            if(oControl){
                const sId = Array.isArray(sControlId) ? sControlId[0] : sControlId;
                let sFormSubtitle = oControl.getParent().getTitle().getText(); //Me da el subtitulo del campo donde hay error
                let sFormTitle = oControl.getParent().getParent().getParent().getTitle(); //Me da el titulo del campo que da error
                return sFormTitle + ", " + sFormSubtitle;

            }
        },

        //Puede aplicarse para navegar al controller si se encuentra en la aplicacion
        // //Si lo encuentra, el valor de activeTitle se cambia a true, y ejecuta la funcion activeTitlePress. 
        isPositionable : function(aControlIds){
            return Array.isArray(aControlIds) && aControlIds.length > 0; //Si el mensaje está asociado a un control, el título es clickeable
        },


        mpIconFormatter: function(){
            let sIcon;
            let aMessage=this._MessageManager.getMessageModel().oData; //Accedo a todos los mensajes

            //Esta funcion itera/recorre sobre todo el array de los mensajes y vuelta por vuelta, me pasa cada uno en los parametros
            aMessage.forEach(function(sMessage){ 

            }); 
            return "sap-icon://message-error"       
        }
    });
});
