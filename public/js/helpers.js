(function () {
    'use strict';

    var _HELPERS = {};

    function onCompleteTab(tabId, info) {

    }

    function prepareParseProfile(options, callback) {
        var url = options.url;

        async.waterfall([

            // open new tab (if need)
            function (cb) {
                chrome.tabs.create({url: url, active: false}, function(tab) {
                    chrome.tabs.onUpdated.addListener(function (tabId, info) {
                        if (tabId === tab.id && (info.status === "complete")) {
                            console.log('... complete');
                            //onCompleteTab(tabId, info);

                            cb(null, tabId);
                        }
                    });
                });
            },

            // close the previous tab(if need):
            function(tabId, cb) {
                chrome.tabs.remove(tabId, function() {
                    console.log('>>> closed %d', tabId);
                    cb(null, null);
                });
            },

            /*!// add "onLoad" listener:
            function(_tabId, cb) {
                chrome.tabs.onUpdated.addListener(function (tabId, info) {
                    if (tabId === _tabId && (info.status === "complete")) {
                        console.log('... complete');

                        cb(null, _tabId);
                    }
                });
            }*/

        ], function(err, tabId) {
            var results;

            if (err) {
                return callback(err);
            }

            results = {
                tabId: tabId
            };

            callback(null, results);
        });
    }
    function parseLinkedInProfiles (options, callback) {
        var profiles = options.profiles;
        var success = options.success;
        var error = options.error;
        var tabId;

        async.eachOfSeries(profiles, function(profile, index, cb) {
            // var link = profile.link
            var link = 'tetiana-bysaha-637a427b'; // TODO: !!!
            var _options = {
                url: 'https://www.linkedin.com/in/' + link,
                tabId: tabId
            };

            prepareParseProfile(_options, function(err, data) {
                if (err) {
                    return cb(err);
                }

                console.log('>>> data', data);
                tabId = data.tabId;

                cb();
            });

        }, function(err) {
            if (err) {
                return callback(err);
            }

            callback();
        });
    };

    _HELPERS.prepareParseProfile = prepareParseProfile;
    _HELPERS.parseLinkedInProfiles = parseLinkedInProfiles;

    window.APP_HELPERS = _HELPERS;
})();