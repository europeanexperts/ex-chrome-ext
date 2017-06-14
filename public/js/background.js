(function () {
    'use strict';

    var CONFIG = GET_APP_CONFIG();
    var IMPORT_URL = CONFIG.BASE_URL + '/api/import/consultants';
    var REFRESH_PROFILE = 'REFRESH_PROFILE';

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
                profile.is_exported = true;
                localStorage.setItem('profile_' + profile.link, JSON.stringify(profile));

                callback(null, res);
            },
            error      : function (err) {
                callback(err);
            }
        });
    }

    function refreshProfile(profile) {
        profile.is_exported = true;
        localStorage.setItem('profile_' + profile.link, JSON.stringify(profile));

        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(function (tab) {
                var data;

                if (tab.url.indexOf(CONFIG.BASE_URL) !== 0) { // The url must begin with BASE_URL
                    return;
                }

                data = $.extend({}, profile);
                chrome.tabs.sendMessage(tab.id, data, function (res) {
                    console.log('>>> res from ' + tab.id, res);
                });
            });
        });
    }

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.type === 'importProfile') {
            importProfileRequest(request.data, function (err, res) {
                sendResponse({error: err, success: res, req: request});
            });
        } else if (request.type === REFRESH_PROFILE) {
            refreshProfile(request);
            sendResponse({data: 'OK', req: request});
        } else {
            sendResponse({data: 'default', req: request});
        }

        return true;
    });
})();