(function () {
    'use strict';

    var APP_ENV = 'dev';
    var CONF_DEV = Object.freeze({
        ENV            : 'dev',
        BASE_URL       : 'http://euex-stage.fpdev.xyz',
        HUNTER_API_HOST: 'https://api.hunter.io/v2'
    });

    var CONF_LIVE = Object.freeze({
        ENV            : 'live',
        BASE_URL       : 'https://join.europeanexperts.com',
        HUNTER_API_HOST: 'https://api.hunter.io/v2'
    });

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
