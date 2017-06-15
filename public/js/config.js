(function () {
    'use strict';

    var APP_ENV = 'live';
    var SHARED_CONF = {
        HUNTER_API_HOST        : 'https://api.hunter.io/v2',
        REFRESH_PROFILE_MESSAGE: 'REFRESH_PROFILE',
        FIND_EMAIL_MESSAGE     : 'FIND_EMAIL',
        IMPORT_PROFILE_MESSAGE : 'IMPORT_PROFILE'
    };

    var CONF_DEV = $.extend({}, SHARED_CONF, {
        ENV            : 'dev',
        BASE_URL       : 'http://euex-stage.fpdev.xyz'
    });

    var CONF_LIVE = $.extend({}, SHARED_CONF, {
        ENV            : 'live',
        BASE_URL       : 'https://join.europeanexperts.com'
    });

    Object.freeze(CONF_DEV);
    Object.freeze(CONF_LIVE);

    function getAppEnv() {
        var confStr = localStorage.getItem('APP_CONFIG');
        var data;

        try  {
            data = JSON.parse(confStr);
        } catch(e) {
            console.warn(e);
        }

        data = data || {};

        return data.app_env || APP_ENV;
    }

    window.GET_APP_CONFIG = function(type) {
        type = type || getAppEnv();

        if (type === 'live') {
            return CONF_LIVE;
        }

        if (type === 'dev') {
            return CONF_DEV
        }

        return CONF_DEV; // by default
    }
})();
