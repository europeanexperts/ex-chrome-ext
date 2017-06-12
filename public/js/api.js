'use strict';

(function () {

    // var BASE_URL = 'http://euex-stage.fpdev.xyz';
    var BASE_URL = 'https://join.europeanexperts.com';

    var AUTH_URL = BASE_URL + '/api/sessions';
    var RESTORE_URL = BASE_URL + '/api/password_resets';
    var IMPORT_URL = BASE_URL + '/api/import/consultants';

    window.EXT_API = {
        AUTH_TOKEN: null,

        // auth:
        login         : function (data, callback) {
            $.ajax({
                url        : AUTH_URL,
                method     : 'POST',
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                data       : JSON.stringify(data),
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },
        logout        : function (callback) {
            $.ajax({
                url        : AUTH_URL,
                method     : 'DELETE',
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },
        forgotPassword: function (data, callback) {
            $.ajax({
                url        : RESTORE_URL,
                method     : 'POST',
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                data       : JSON.stringify(data),
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },

        // profiles:
        storeProfileLocal: function (options, callback) {
            var jobId = options.jobId;
            var profile = options.profile;
            var link = options.link;

            profile.jobs = profile.jobs || [];
            profile.jobs.push(jobId);

            localStorage.setItem('profile_' + link, JSON.stringify(profile));

            callback(null, {success: 'OK'});
        },
        getProfileLocal: function(options) {
            var link = options.link;
            var value = localStorage.getItem('profile_' + link);
            var profileJSON;

            if (!value) {
                return null;
            }

            try {
                profileJSON = JSON.parse(value);
            } catch(err) {
                console.error(err);
                profileJSON = null;
            }

            return profileJSON;
        },
        setProfileExported: function(options) {
            var link = options.link;
            var profileJSON = this.getProfileLocal({link: link});

            profileJSON.is_exported = true;
            localStorage.setItem('profile_' + link, JSON.stringify(profileJSON));
        },
        mapLocalProfiles: function(profiles) {
            var self = this;

            return profiles.map(function(profile) {
                var profileLocal = self.getProfileLocal({link: profile.link});

                profile.is_exported = (profileLocal && profileLocal.is_exported) || false;

                return profile;
            });
        },

        // import:
        importProfile: function(options, callback) {
            var profile = options.profile;

            $.ajax({
                url        : IMPORT_URL,
                method     : 'POST',
                headers    : {
                    'X-Authorization': EXT_API.AUTH_TOKEN
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
    }
})();