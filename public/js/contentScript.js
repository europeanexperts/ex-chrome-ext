chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method === 'jobs') {
        SOCIAL_PARSER.onLoadJobs(function () {
            sendResponse({data: SOCIAL_PARSER.parseJobs(), method: "runtime", _pre: request});
        });
    } else if (request.method === 'profile') {
        SOCIAL_PARSER.onLoadProfile(function () {
            sendResponse({data: SOCIAL_PARSER.parseProfile(), method: "runtime", _pre: request});
        });
    } else if (request.method = 'loadURL') {
        SOCIAL_PARSER.loadURL(request.url);
        sendResponse({data: 'OK', method: "runtime", _pre: request});
    } else {
        sendResponse({data: 'DEFAULT', method: "runtime",_pre: request});
    }

    return true;
});