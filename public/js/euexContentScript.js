(function () {
    'use strict';

    var REFRESH_PROFILE = 'REFRESH_PROFILE';

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var messageData;

        if (request.type === REFRESH_PROFILE) {
            sendResponse({data: 'OK'});
            messageData = {
                type   : request.type,
                profile: request.data
            };

            window.postMessage(messageData, '*');
        } else {
            sendResponse({data: 'DEFAULT'});
        }

        // return true;
    });
})();