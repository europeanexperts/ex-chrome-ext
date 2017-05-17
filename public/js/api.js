'use strict';

(function () {
    var BASE_URL = 'http://euex-stage.fpdev.xyz';
    var AUTH_URL = BASE_URL + '/api/sessions';
    var RESTORE_URL = BASE_URL + '/api/password_resets';

    window.EXT_API = {
        AUTH_TOKEN    : null,
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
        fetchJobList      : function (data, callback) {
            // put ajax method here

            setTimeout(function () {
                var jobs = EXT_API.parseJobs(localStorage.getItem('jobs'));
                var _data = jobs.map(function (item) {
                    item.avatar = item.avatar || 'ja';
                    item.profiles = item.profiles || 0;

                    return item;
                });

                callback(null, _data);
            }, 200);
        },
        fetchJob      : function (data, callback) {
            // put ajax method here
            console.log('>>> API fetchJob', data);

            var id = parseInt(data.id, 10);
            var jobs = EXT_API.parseJobs(localStorage.getItem('jobs'));
            var job = jobs.find(function (item) {
                return item.id === id;
            });

            setTimeout(function () {
                callback(null, job);
            }, 200);
        },

        parseJobs: function (jobsStr) {
            var arr;

            try {
                arr = JSON.parse(jobsStr) || [];
            } catch (e) {
                console.warn(e);
                arr = [];
            }

            return arr;
        },
        saveJob: function (_data, callback) {
            // put ajax method here

            var data = $.extend({}, _data); // to create a new object
            var now = new Date();
            var jobs = EXT_API.parseJobs(localStorage.getItem('jobs'));
            var job;
            var jobIndex;

            data.createdAt = data.createdAt || now;
            data.updatedAt = now;

            if (!data.id) {
                data.id = now.valueOf();
                jobs.push(data);
            } else {
                job = jobs.find(function (item) {
                    return item.id === data.id;
                });
                jobIndex = jobs.indexOf(job);
                jobs[jobIndex] = data;
            }

            localStorage.setItem('jobs', JSON.stringify(jobs));

            callback(null, data);
        },
        deleteJobs: function (ids, callback) {
            // put ajax method here

            var jobs = EXT_API.parseJobs(localStorage.getItem('jobs'));
            var intIds = ids.map(function (id) {
                return parseInt(id, 10);
            });
            var _jobs = [];

            jobs.forEach(function (job) {
                if (intIds.indexOf(job.id) === -1) {
                    _jobs.push(job);
                }
            });

            localStorage.setItem('jobs', JSON.stringify(_jobs));

            callback();
        }
    }
})();