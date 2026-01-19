// @ts-nocheck
// Se desactiva el chequeo de TypeScript porque SAPUI5 usa patrones dinámicos
// (binding, acceso a propiedades internas, etc.)

// Define un módulo de SAPUI5 y especifica sus dependencias
sap.ui.define([
    // Controller base de SAPUI5
    "sap/ui/core/mvc/Controller",

    // Modelo JSON para datos locales
    "sap/ui/model/json/JSONModel",

    // Core de UI5 (para acceder al MessageManager global)
    "sap/ui/core/Core",

    // Componentes visuales para mensajes
    "sap/m/MessagePopover",
    "sap/m/MessageItem",

    // Registro global de controles (para localizar Inputs con error)
    "sap/ui/core/Element",

    // Librería core (MessageType enum)
    "sap/ui/core/library",

    // Clase Message (mensaje real que gestiona el MessageManager)
    "sap/ui/core/message/Message"

], function (
    Controller,
    JSONModel,
    Core,
    MessagePopover,
    MessageItem,
    Element,
    library,
    Message
) {
    "use strict";

    // Enum de tipos de mensaje (Error, Warning, Success, Information)
    const MessageType = library.MessageType;

    // Extiende el Controller base y crea el controller de la aplicación
    return Controller.extend("com.devjero.forms.forms.controller.App", {

        /**
         * =====================================================
         * onInit
         * Método de ciclo de vida
         * Se ejecuta cuando la vista es creada
         * =====================================================
         */
        onInit: function () {

            // =========================
            // MODELO DE DATOS
            // =========================

            // Se crea una instancia de JSONModel vacía
            const oModel = new JSONModel();

            // Carga los datos desde el archivo JSON local de forma asíncrona
            oModel.loadData("./localService/mockdata/CustomerModel.json");

            // Obtiene la referencia a la vista asociada a este controller
            this.oView = this.getView();

            // Asigna el modelo JSON como modelo principal (sin nombre) de la vista
            // Este es el modelo por defecto (sin nombre)
            // En el XML se usa así:
            // <Input value="{/forms/0/name}" />
            this.oView.setModel(oModel);

            // =========================
            // MESSAGE MANAGER
            // =========================

            // Obtiene la instancia singleton del MessageManager de SAPUI5
            // Centraliza errores, warnings, validaciones, etc.
            this._MessageManager = Core.getMessageManager();

            // Elimina todos los mensajes existentes (limpia el estado previo)
            this._MessageManager.removeAllMessages();

            // Registra el control "vbPersonal" para que el MessageManager observe
            // este control y todos sus hijos (segundo parámetro = true)
            // para detectar errores automáticamente
            this._MessageManager.registerObject(
                this.oView.byId("vbPersonal"),
                true
            );

            // Obtiene el modelo de mensajes del MessageManager y lo asigna a la vista
            // Se le asigna el nombre "message" para no sobrescribir el modelo principal
            // Una vista puede tener múltiples modelos con diferentes nombres
            this.oView.setModel(
                this._MessageManager.getMessageModel(),
                "message"
            );

            // Llama al método que crea el MessagePopover (ventana emergente de mensajes)
            this.createMessagePopover();

            // Flujo completo:
            // Vista creada → controller inicializado →
            // JSON cargado → modelo asignado →
            // MessageManager configurado →
            // App lista para mostrar datos y validar errores
        },

        /**
         * =====================================================
         * createMessagePopover
         * Crea el MessagePopover que muestra errores y warnings
         * =====================================================
         */
        createMessagePopover: function () {

            // Guarda referencia al controller para usarla dentro de callbacks
            const oController = this;

            // Crea una nueva instancia del MessagePopover
            this.oMP = new MessagePopover({

                // Evento que se ejecuta cuando el usuario hace clic en el título de un mensaje
                activeTitlePress: function (oEvent) {

                    // Obtiene el item (mensaje) que fue presionado
                    const oItem = oEvent.getParameter("item");

                    // Obtiene la referencia a la página principal para hacer scroll
                    const oPage = oController.getView().byId("pageMain");

                    // Obtiene el objeto Message completo desde el binding context
                    // del modelo "message"
                    const oMessage = oItem
                        .getBindingContext("message")
                        .getObject();

                    // Busca el control UI (Input, Select, etc.) asociado al mensaje
                    // usando su ID en el registro global de elementos
                    const oControl = Element.registry.get(
                        oMessage.getControlId()
                    );

                    // Si el control existe en el DOM
                    if (oControl) {
                        // Hace scroll hasta el elemento del control
                        // 200ms de duración, offset de -100px desde arriba
                        oPage.scrollToElement(
                            oControl.getDomRef(),
                            200,
                            [0, -100]
                        );

                        // Después de 300ms (cuando termina el scroll), enfoca el campo
                        setTimeout(function () {
                            oControl.focus();
                        }, 300);
                    }
                },

                // Configuración del binding para los items del popover
                items: {
                    // Path al modelo de mensajes (raíz del modelo "message")
                    path: "message>/",
                    // Template que define cómo se renderiza cada mensaje
                    template: new MessageItem({

                        // Texto principal del mensaje (ej: "Campo obligatorio")
                        title: "{message>message}",

                        // Texto secundario (ej: nombre del campo "Email")
                        subtitle: "{message>additionalText}",

                        // Define el nombre del grupo para agrupar mensajes
                        groupName: {
                            // Array de propiedades a usar en el formatter
                            parts: [{ path: "message>controlIds" }],
                            // Función que devuelve el nombre del grupo
                            formatter: this.getGroupName
                        },

                        // Define si el título es clickeable (navega al campo)
                        activeTitle: {
                            // Array de propiedades a usar en el formatter
                            parts: [{ path: "message>controlIds" }],
                            // Función que determina si es posicionable
                            formatter: this.isPositionable
                        },

                        // Convierte el tipo de mensaje de String a Enum MessageType
                        type: {
                            // Path a la propiedad type del mensaje
                            path: "message>type",
                            // Función que convierte "Error" → MessageType.Error
                            formatter: function (sType) {
                                return MessageType[sType] || MessageType.None;
                            }
                        },

                        // Descripción extendida del mensaje
                        description: "{message>message}"
                    })
                },

                // Activa el agrupamiento visual de mensajes
                groupItems: true
            });

            // Agrega el MessagePopover como dependiente de la vista
            // Esto asegura que se destruya automáticamente cuando se destruya la vista
            this.getView()
                .byId("messagePopover")
                .addDependent(this.oMP);
        },

        /**
         * =====================================================
         * getGroupName
         * Devuelve el nombre del grupo para el MessagePopover
         * =====================================================
         */
        getGroupName: function (aControlIds) {
            // Obtiene el primer ID de control (puede ser array o string)
            const sId = Array.isArray(aControlIds) ? aControlIds[0] : aControlIds;
            // Busca el control en el registro global
            const oControl = Element.registry.get(sId);

            // Si encuentra el control
            if (oControl) {
                // Obtiene el título del FormContainer (subtítulo, ej: "Datos Personales")
                const sFormSubtitle = oControl.getParent().getTitle().getText();
                // Navega hacia arriba en el árbol: Parent → Parent → Parent
                // para obtener el título del Form principal (ej: "Formulario Cliente")
                const sFormTitle = oControl
                    .getParent()
                    .getParent()
                    .getParent()
                    .getTitle();

                // Retorna el nombre compuesto: "Formulario Cliente - Datos Personales"
                return sFormTitle + " - " + sFormSubtitle;
            }
        },

        /**
         * =====================================================
         * isPositionable
         * Define si el mensaje puede navegar al control
         * Si lo encuentra, el valor de activeTitle se cambia a true, y ejecuta la función activeTitlePress.
         * =====================================================
         */
        isPositionable: function (aControlIds) {
            // Retorna true si hay al menos un control asociado al mensaje
            // Si el mensaje está asociado a un control, el título es clickeable
            return Array.isArray(aControlIds) && aControlIds.length > 0;
        },



    //LOGICA BOTON MESSAGE -------------------------------------------------------------------------


        /**
         * =====================================================
         * mpIconFormatter
         * Devuelve el ícono según la severidad más alta (Error -> Warning -> Success -> Information)
         * =====================================================
         */
        mpIconFormatter: function () {
            // Variable para almacenar el ícono resultante
            let sIcon;
            // Obtiene el array de todos los mensajes del MessageManager
            const aMessages = this._MessageManager.getMessageModel().oData;

            // Itera sobre todos los mensajes para determinar el ícono de mayor severidad
            // Lista de severidad (Mayor a menor): Error -> Warning -> Success -> Information
            aMessages.forEach(function (oMessage) {
                // Switch que evalúa el tipo de cada mensaje
                switch (oMessage.type) {
                    case "Error":
                        // Error tiene máxima prioridad, siempre sobrescribe
                        sIcon = "sap-icon://message-error";
                        break;
                    case "Warning":
                        // Warning solo se asigna si no hay Error
                        if (sIcon !== "sap-icon://message-error") {
                            sIcon = "sap-icon://message-warning";
                        }
                        break;
                    case "Success":
                        // Success solo se asigna si no hay nada asignado
                        if (!sIcon) {
                            sIcon = "sap-icon://message-success";
                        }
                        break;
                    default:
                        // Information es la menor prioridad
                        if (!sIcon) {
                            sIcon = "sap-icon://message-information";
                        }
                }
            });

            // Retorna el ícono de mayor severidad encontrado
            return sIcon;
        },

        /**
         * =====================================================
         * mpTypeFormatter
         * Devuelve el tipo de botón según severidad
         * =====================================================
         */
        mpTypeFormatter: function () {
            // Variable para almacenar el tipo de severidad más alta
            let sHighSeverity;
            // Obtiene el array de todos los mensajes
            const aMessages = this._MessageManager.getMessageModel().oData;

            // Itera sobre los mensajes para determinar el tipo de botón
            aMessages.forEach(function (oMessage) {
                // Switch que convierte tipo de mensaje a tipo de botón SAPUI5
                switch (oMessage.type) {
                    case "Error":
                        // Error → botón rojo (Negative)
                        sHighSeverity = "Negative";
                        break;
                    case "Warning":
                        // Warning → botón naranja/amarillo (Critical)
                        // Solo si no hay Error
                        if (sHighSeverity !== "Negative") {
                            sHighSeverity = "Critical";
                        }
                        break;
                    case "Success":
                        // Success → botón verde (Success)
                        // Solo si no hay severidades mayores
                        if (!sHighSeverity) {
                            sHighSeverity = "Success";
                        }
                        break;
                    default:
                        // Information → botón azul/gris (Neutral)
                        // Menor prioridad
                        if (!sHighSeverity) {
                            sHighSeverity = "Neutral";
                        }
                }
            });

            // Retorna el tipo de severidad más alta
            return sHighSeverity;
        },

        /**
         * =====================================================
         * mpSeverityMessages
         * Devuelve la cantidad de mensajes de mayor severidad junto al texto
         * =====================================================
         */
        mpSeverityMessages: function () {
            // Obtiene el tipo de botón (Negative, Critical, Success, Neutral)
            const sButtonType = this.mpTypeFormatter();
            // Variable para almacenar el tipo de mensaje a contar
            let sMessageType;

            // Convierte el tipo de botón a tipo de mensaje
            switch (sButtonType) {
                case "Negative":
                    // Si el botón es Negative → contar mensajes de Error
                    sMessageType = "Error";
                    break;
                case "Critical":
                    // Si el botón es Critical → contar mensajes de Warning
                    sMessageType = "Warning";
                    break;
                case "Success":
                    // Si el botón es Success → contar mensajes de Success
                    sMessageType = "Success";
                    break;
                default:
                    // Por defecto → contar mensajes de Information
                    sMessageType = "Information";
            }

            // Usa reduce para contar mensajes del tipo más grave
            // Array de mensajes donde cada mensaje tiene type: "Error" | "Warning" | "Success" | "Information"
            return this._MessageManager.getMessageModel().oData.reduce(
                function(iNumerOfMessage, oMessageItem){
                    // iNumerOfMessage es el acumulador (contador que arranca en 0)
                    // oMessageItem es el mensaje actual (cada objeto del array)
                    
                    // ¿El tipo de este mensaje es igual al tipo más grave detectado?
                    return oMessageItem.type === sMessageType
                        ? ++iNumerOfMessage // Si el mensaje es del tipo buscado → sumo 1
                        : iNumerOfMessage; // Si no → dejo el contador igual
                },
                0 // Valor inicial del contador (comienza en 0)
            ) || ""; // Si el resultado final es 0, retorna string vacío (no muestra número en el botón)
        },

        /**
         * =====================================================
         * handleMessagePopover
         * Abre o cierra el MessagePopover
         * =====================================================
         */
        handleMessagePopover: function (oEvent) {
            // Si el MessagePopover no existe, lo crea
            if (!this.oMP) {
                this.createMessagePopover();
            }
            // Alterna la visibilidad del popover (abre si está cerrado, cierra si está abierto)
            // El popover se posiciona relativamente al botón que disparó el evento
            this.oMP.toggle(oEvent.getSource());
        },





        //Campos Obligatorios -------------------------------------------------------------------------------------------

        /**
         * =====================================================
         * handleRequiredField
         * Valida campos obligatorios
         * =====================================================
         */
        handleRequiredField: function (oInput) {

            // Construye el target (ruta completa al campo en el modelo)
            // Ejemplo: "/forms/0/name"
            // getBindingContext().getPath() → "/forms/0"
            // getBindingPath("value") → "name"
            //El sTarget asocia el mensaje de error con un campo específico del modelo. Así el MessageManager sabe a qué campo pertenece cada error, qué input debe marcarse en rojo y donde hacer scroll cuando el usuario hace clic en el mensaje
            const sTarget = //Es la ruta completa: "En el array forms, posición 0, propiedad name", por ejemplo
                oInput.getBindingContext().getPath() +
                "/" + //por ejemplo: "/forms/0"
                oInput.getBindingPath("value"); //por ejemplo "name"

            // Elimina cualquier mensaje previo asociado a este campo (evita duplicados)
            this.removeMessageFromTarget(sTarget);

            // Valida si el campo está vacío
            if (!oInput.getValue()) {
                // Agrega un nuevo mensaje de error al MessageManager
                this._MessageManager.addMessages(
                    new Message({
                        // Texto del mensaje que se muestra al usuario
                        message: "Mandatory field required",
                        // Tipo de mensaje (Error aparece en rojo)
                        type: MessageType.Error,
                        // Texto adicional (nombre del campo, ej: "Email")
                        // getLabels()[0] obtiene el primer label asociado al input
                        additionalText: oInput.getLabels()[0].getText(),
                        // Target: ruta al campo en el modelo (para asociar mensaje a campo específico)
                        target: sTarget,
                        // Processor: el modelo que procesa este mensaje
                        processor: this.getView().getModel()
                    })
                );
            }
        },

        /**
         * =====================================================
         * removeMessageFromTarget
         * Elimina mensajes asociados a un campo
         * =====================================================
         */
        removeMessageFromTarget: function (sTarget) {
            // Obtiene todos los mensajes actuales del MessageManager
            this._MessageManager.getMessageModel().getData().forEach(
                function (oMessage) {
                    // Si el mensaje está asociado al target especificado
                    if (oMessage.target === sTarget) {
                        // Elimina ese mensaje del MessageManager
                        this._MessageManager.removeMessages(oMessage);
                    }
                }.bind(this) // .bind(this) mantiene el contexto del controller
            );
        },

        checkInputConstrains: function(group, oInput){
            var oBinding=oInput.getBinding("value"),
                sValueState="None", //Con esto puedo determinar si hay error en el campo o no (se cambia el estado si hay error),
                message,
                type,
                description,
                sTarget=oInput.getBindingContext().getPath() + "/" + oInput.getBindingPath("value");

                // Elimina cualquier mensaje previo asociado a este campo (evita duplicados)
                this.removeMessageFromTarget(sTarget);

                switch(group){
                    //Determino que mensaje mostrar en caso de error
                    case "GR1":
                        message= "Invalid email";
                        type=MessageType.Error;
                        description="The value of the email field should be a valid email adress";
                        sValueState="Error";
                        break;
                    
                    case "GR2":
                        //Determino que mensaje mostrar en caso de warning
                        message= "The value should not exceed 40";
                        type=MessageType.Warning;
                        description="The value of the working hours should no exceed 40 hours";
                        sValueState="Warning";
                        break;

                    default:
                        break;
                }

                try {
                    //validateValue valida lo que se ingresa de acuerdo a las limitaciones del XML.
                    //Si cumple la limitacion no levanta una excepcion 
                    oBinding.getType().validateValue(oInput.getValue()); //me devuelve el valor del campo

                    //Si no cumple la limitacion, se levanta una excepcion, la captura y lo añade en un mensaje en el XML con el MessageManager
                } catch (oException) {
                    this._MessageManager.addMessages(
                        new Message({
                            message: message,
                            type: type,
                            additionalText: oInput.getLabels()[0].getText(), //Texto de donde a saltado el mensaje
                            description: description,
                            target: sTarget,
                            processor: this.getView().getModel()
                        }),
                    );

                    oInput.setValueState(sValueState);
                    
                }

        },

        onChange: function(oEvent){
            var oInput= oEvent.getSource();

            //Si se trata de un campo obligatorio, que tiene required
            if(oInput.getRequired){
                //Debe llamar a la funcion handleRequiredField
                this.handleRequiredField(oInput);
            }

            //Si se trata de un campo change
            if(oInput.getLabels()[0].getText() === "Weekly Hours"){ //si estos coiniciden
                //Debe llamar a la funcion handleRequiredField
                this.checkInputConstrains("GR2", oInput)
            }else{
                this.checkInputConstrains("GR1", oInput)
            }


        }

    });
});