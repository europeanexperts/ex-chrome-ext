chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method === 'jobs') {
        sendResponse({data: SOCIAL_PARSER.parseJobs(), method: "runtime", _pre: request});
    } else {
        sendResponse({data: 'DEFAULT', method: "runtime",_pre: request});
    }
});