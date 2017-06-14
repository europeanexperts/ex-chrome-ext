(function () {
    'use strict';

    var CONFIG = GET_APP_CONFIG();
    var IMPORT_URL = CONFIG.BASE_URL + '/api/import/consultants';

    var HUNTER_API_KEY = '52c698fd10eebf0576effcd0b93abb554adfce8a';
    var HUNTER_API_HOST = CONFIG.HUNTER_API_HOST;

    function getAuthToken() {
        return localStorage.getItem('AUTH_TOKEN');
    }

    function getHunterApiKey() {
        var str = localStorage.getItem('AUTH_PROFILE');
        var data;

        try {
            data = JSON.parse(str);
        } catch (e) {
            console.warn(e);
        }

        data = data || {};

        return data.hunter_api_key;
    }

    function getFindEmailURL(options) {
        var url = HUNTER_API_HOST + '/email-finder?api_key=' + options.apiKey;
        var params = {
            domain   : 'domain',
            companyId: 'linkedin_id',
            firstName: 'first_name',
            lastName : 'last_name'
        };

        Object.keys(params).forEach(function (attr) {
            var param = options[attr];

            if (param) {
                url += '&' + params[attr] + '=' + encodeURIComponent(param);
            }
        });

        return url;
    }

    function parseHunterApiError(xhr) {
        var res;
        var err;

        console.error(xhr);
        res = xhr.responseJSON || {};
        if ( !res || !res.errors || !res.errors.length) {
            return res;
        }

        err = res.errors[0];

        return err.details || 'api error';
    }

    function findHunterEmail(options, callback) {
        var apiKey = getHunterApiKey();
        var url;

        if (!apiKey) {
            return callback('The Hunter API Key was not found');
        }

        options.apiKey = apiKey;
        url = getFindEmailURL(options);

        $.ajax({
            url     : url,
            headers : {
                'Email-Hunter-Origin': 'chrome_extension'
            },
            type    : 'GET',
            dataType: 'json',
            success : function (res) {
                callback(null, res);
            },
            error   : function (res) {
                callback(parseHunterApiError(res));
            }
        });
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

        } else if (request.type === CONFIG.REFRESH_PROFILE_MESSAGE) {
            refreshProfile(request);
            sendResponse({data: 'OK', req: request});

        } else if (request.type === CONFIG.FIND_EMAIL_MESSAGE) {
            findHunterEmail(request.data, sendResponse);

        } else {
            sendResponse({data: 'default', req: request});
        }

        return true;
    });
})();