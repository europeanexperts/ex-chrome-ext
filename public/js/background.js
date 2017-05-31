(function () {
    'use strict';

    var IMPORT_URL = 'http://euex-stage.fpdev.xyz/api/import/consultants';

    function getAuthToken() {
        return localStorage.getItem('AUTH_TOKEN');
    }

    function importProfileRequest(options, callback) {
        var authToken = getAuthToken();
        var profile = options.profile;

        if (!authToken) {
            return callback('<b>Unauthorized!</b> You must to log in into Chrome Extension.');
        }

        $.ajax({
            url        : IMPORT_URL,
            method     : 'POST',
            headers    : {
                'X-Authorization': authToken
            },
            crossDomain: true,
            contentType: 'application/json',
            accepts    : 'json',
            data       : JSON.stringify(profile),
            success    : function (res) {
                callback(null, res);
            },
            error      : function (err) {
                callback(err);
            }
        });
    }

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.type === 'importProfile') {
            importProfileRequest(request.data, function (err, res) {
                sendResponse({error: err, success: res, req: request});
            });
        } else {
            sendResponse({data: 'default', req: request});
        }

        return true;
    });
})();