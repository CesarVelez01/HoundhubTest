/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');
const helper = require('./helper');
const mysql = require('mysql');

async function getServicePriceSync(serviceType, serviceDetail) {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.czmoiem282w5.us-east-1.rds.amazonaws.com',
      user: 'admin',
      password: 'RHvNlwsYDefcR42r26tP',
      database: 'houndhubDB',
    });

    const [rows] = await connection.execute(
      'SELECT price FROM services WHERE service = ? AND serviceDetail = ?',
      [serviceType, serviceDetail]
    );

    connection.end();

    if (!rows.length) {
      return null; // Indica que no se encontró el precio
    }

    return rows[0].price;
  } catch (error) {
    console.error('Error al obtener el precio del servicio:', error);
    throw new Error('Ocurrió un error al recuperar el precio del servicio.');
  }
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Hello! Welcome to Hound Hub. We offer dog training, dog walking, and veterinary services. Which would you like to try?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Hound Hub lets you request selected services for your dog. Try asking for dog training, dog walking, or veterinary services.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

const GetServiceIntentHandler = {
    canHandle(handlerInput) {
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' 
          && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetServiceIntent';
    },
    handle(handlerInput) {
        
        var service;
        var resolvedService;
        var serviceSlot;
    
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        
        serviceSlot = Alexa.getSlot(handlerInput.requestEnvelope, "service");
        service = serviceSlot.value;

        //service = helper.getSpokenWords(handlerInput, "service");
        resolvedService = helper.getResolvedWords(handlerInput, "service");

        var speakOutput = "";

        if (resolvedService) {
        
        var selectedService = resolvedService[0].value.name
        
        speakOutput = `I heard you say that you want a dog ${selectedService}. `
        if (selectedService === "walker") {
         speakOutput += `We offer daily, weekly, or twice-a-week dog walking packages. `;
         }
        if (selectedService === "vet") {
         speakOutput += `We offer vaccinations and checkups. `;
         }
        if (selectedService === "trainer") {
         speakOutput += `We offer beginner, intermediate, and advanced obedience training. `;
         }
         speakOutput += "Which service are you interested in?";
         
         const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
         
         sessionAttributes.selectedService = selectedService;
         
         handlerInput.attributesManager.setSessionAttributes(sessionAttributes);
        }

         else {
             speakOutput = `I heard you say ${service}. I don't offer that service. Choose from dog training, dog walking, or veterinary care.`;
         }
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const GetPriceIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetPriceIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const selectedService = sessionAttributes.selectedService;
      const serviceDetailSlot = Alexa.getSlot(handlerInput.requestEnvelope, 'serviceDetail');
      const serviceDetail = serviceDetailSlot.value;

      if (!selectedService) {
        return handlerInput.responseBuilder
          .speak('¿Qué servicio te gustaría?')
          .reprompt('¿Qué servicio te gustaría?')
          .getResponse();
      }

      const price = await getServicePriceSync(selectedService, serviceDetail);

      if (!price) {
        const speakOutput = `Lo siento, no encontré el precio del servicio "${selectedService}" en el nivel "${serviceDetail}".`;
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt(speakOutput)
          .getResponse();
      }

      const speakOutput = `El precio del servicio "${selectedService}" en el nivel "${serviceDetail}" es de ${price} dólares.`;

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    } catch (error) {
      console.error('Error al manejar GetPriceIntent:', error);
      const speakOutput = 'Lo siento, tuve problemas para obtener el precio. Por favor, inténtalo de nuevo.';
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    }
  }
};

/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        GetServiceIntentHandler,
        GetPriceIntentHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();
