chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method === 'jobs') {
        SOCIAL_PARSER.onLoadJobs(function () {
            sendResponse({data: SOCIAL_PARSER.parseJobs(), method: "runtime", _pre: request});
        });
    } else if (request.method === 'profile') {

        SOCIAL_PARSER.onLoadProfile(function () {
            SOCIAL_PARSER.onChangeParseStatus({status: SOCIAL_PARSER.PARSE_STATUSES.STARTED});
            SOCIAL_PARSER.parseProfileAsync(function(err, data) {
                SOCIAL_PARSER.onChangeParseStatus({status: SOCIAL_PARSER.PARSE_STATUSES.STOPPED});
                sendResponse({err: err, data: data, _pre: request});
            });
        });
    } else if (request.method === 'loadURL') {
        SOCIAL_PARSER.loadURL(request.url);
        sendResponse({data: 'OK', _pre: request});
    } else if (request.method === 'changeParseStatus') {
        SOCIAL_PARSER.onChangeParseStatus({status: request.status});
        sendResponse({data: 'OK', _pre: request});
    } else {
        sendResponse({data: 'DEFAULT', _pre: request});
    }

    return true;
});