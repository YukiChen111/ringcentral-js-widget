import rcMessageService from './rc-message-service';
import { register } from '../service';
var rcMessageProvider = function() {
    
    var messageUpdatedHandlers = [];
    rcMessageService.onMessageUpdated((updatedMessages) => {
        var messageParam = {
            deleted : [],
            updated : []
        };
        updatedMessages.forEach(message => {
            var toAdd = createResult(message);
            if(message.availability === 'Alive'){
                messageParam.updated.push(toAdd);
            }else{
                messageParam.deleted.push(toAdd);                
            }
        });
        messageUpdatedHandlers.forEach(h => {
            try{
                h(messageParam);
            }catch(e){
                console.error(e);
            }
        });
    });

    function createResult(message) {
        var result = {};
        if (message.direction === 'Outbound') {
            if (message.type === 'Pager') {
                result.contact = message.to[0].extensionNumber;
            }else {
                result.contact = message.to[0].phoneNumber;
            }
        }else {
            if (message.type === 'Pager') {
                result.contact = message.from.extensionNumber;
            }else {
                result.contact = message.from.phoneNumber;
            }
        }
        //TODO: Use localization string instead of plain text
        if (message.type === 'SMS' || message.type === 'Pager') {
            result.subject = message.subject;
        }else if (message.type === 'VoiceMail') {
            result.subject = 'Voice Message';
        }else if (message.type === 'Fax') {
            result.subject = 'Fax';
        }
        result.readStatus = message.readStatus;
        result.type = message.type;
        result.id = message.id;
        result.time = message.lastModifiedTime;
        return result;
    }

    return {
        getTextMessages: function() {
            return Promise.resolve(rcMessageService.getMessagesByType('SMS')).then(messages => {
                var results = [];
                messages.forEach(message => {
                    results.push(createResult(message));
                });
                return results;
            });
        },
        //Return all messages of type 'VoiceMail' and 'Fax'. For SMS and Pager, only last message in a conversation
        // will be returned.
        getLastMessagesOfAllType: function() {
            return Promise.resolve(rcMessageService.getAllMessages()).then(messages => {
                var results = [];
                var added = {};
                messages.forEach(message => {
                    var result = createResult(message);
                    //Combine SMS/Pager messages in conversation
                    if (message.conversationId) {
                        if (!added[message.conversationId]) {
                            added[message.conversationId] = [];
                        }
                        added[message.conversationId].push(result);
                    }else {
                        results.push(result);
                    }
                });
                for (var key in added) {
                    if (added.hasOwnProperty(key)) {
                        results.push(added[key][0]);
                    }
                }
                return results;
            });
        },
        onMessageUpdated: function(handler){
            messageUpdatedHandlers.push(handler);
        }
    };
}();
register('rcMessageProvider', rcMessageProvider);
export default rcMessageProvider;

