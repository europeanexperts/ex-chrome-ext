'use strict';

(function () {

    var BASE_URL = 'http://euex-stage.fpdev.xyz';
    var AUTH_URL = BASE_URL + '/api/sessions';
    var RESTORE_URL = BASE_URL + '/api/password_resets';
    var JOBS_URL = BASE_URL + '/api/import/jobs';

    window.EXT_API = {
        //AUTH_TOKEN: null,
        AUTH_TOKEN: 'tbm9yTuwR295oWCOps911A',

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

        // jobs
        fetchJobListLocal: function (data, callback) {
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
        fetchJobList     : function (data, callback) {
            $.ajax({
                url        : JOBS_URL,
                method     : 'GET',
                headers    : {
                    'X-Authorization': EXT_API.AUTH_TOKEN
                },
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                //data       : JSON.stringify(),
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },
        fetchJobLocal    : function (data, callback) {
            // put ajax method here

            var id = parseInt(data.id, 10);
            var jobs = EXT_API.parseJobs(localStorage.getItem('jobs'));
            var job = jobs.find(function (item) {
                return item.id === id;
            });

            setTimeout(function () {
                callback(null, job);
            }, 500);
        },
        fetchJob         : function (data, callback) {
            var url = JOBS_URL + '/' + data.id;

            $.ajax({
                url        : url,
                method     : 'GET',
                headers    : {
                    'X-Authorization': EXT_API.AUTH_TOKEN
                },
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                //data       : JSON.stringify(),
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },
        parseJobs        : function (jobsStr) {
            var arr;

            try {
                arr = JSON.parse(jobsStr) || [];
            } catch (e) {
                console.warn(e);
                arr = [];
            }

            return arr;
        },
        saveJobLocal     : function (_data, callback) {
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
                data.id = parseInt(data.id, 10);
                job = jobs.find(function (item) {
                    return item.id === data.id;
                });
                jobIndex = jobs.indexOf(job);
                jobs[jobIndex] = data;
            }

            localStorage.setItem('jobs', JSON.stringify(jobs));

            callback(null, data);
        },
        saveJob          : function (data, callback) {
            var method;
            var url;

            if (data.id) {
                url = JOBS_URL + '/' + data.id;
                method = 'PUT';
            } else {
                url = JOBS_URL;
                method = 'POST';
            }

            $.ajax({
                url        : url,
                method     : method,
                headers    : {
                    'X-Authorization': EXT_API.AUTH_TOKEN
                },
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

        deleteJobsLocal: function (ids, callback) {
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
        },
        deleteJobs     : function (ids, callback) {
            var url = JOBS_URL + '/bulk_delete';
            var intIds = ids.map(function (id) {
                return parseInt(id, 10);
            });

            $.ajax({
                url        : url,
                method     : 'DELETE',
                headers    : {
                    'X-Authorization': EXT_API.AUTH_TOKEN
                },
                crossDomain: true,
                contentType: 'application/json',
                accepts    : 'json',
                data       : JSON.stringify({ids: intIds}),
                success    : function (res) {
                    callback(null, res);
                },
                error      : function (err) {
                    callback(err);
                }
            });
        },

        // profiles:
        fetchJobProfilesLocal: function (options, callback) {
            var jobId = options.job_id;
            var key = 'job_profiles_' + jobId;
            var jsonValue;
            var profiles;

            try {
                jsonValue = JSON.parse(localStorage.getItem(key));
                profiles = jsonValue.profiles || [];

                callback(null, profiles);
            } catch (err) {
                callback(null, err);
            }
        },

        saveJobProfiles: function (options, callback) {
            var jobId = options.job_id;
            var key = 'job_profiles_' + jobId;
            var value = {
                job_id  : jobId,
                profiles: options.profiles
            };

            localStorage.setItem(key, JSON.stringify(value));

            setTimeout(function () {
                callback(null, value);
            }, 500);
        },

        API_saveJobProfiles: function (options, callback) {
            var data = {
                id      : options.job_id,
                profiles: options.profiles || []
            };

            EXT_API.saveJob(data, callback);
        },

        storeProfile: function (options, callback) {
            var jobId = options.jobId;
            var profile = options.profile;
            var link = options.link;
            var key;
            var jsonValue;
            var profiles;

            // store the profile
            profile.jobId = jobId;
            localStorage.setItem('profile_' + link, JSON.stringify(profile));

            // change job profile status:
            key = 'job_profiles_' + jobId;

            try {
                jsonValue = JSON.parse(localStorage.getItem(key));
                profiles = jsonValue.profiles || [];
            } catch (err) {
                return callback(err);
            }

            profiles.forEach(function (item) {
                if (item.link === link) {
                    item.status = 1;
                    item.parsedAt = new Date()
                }
            });

            localStorage.setItem(key, JSON.stringify({
                job_id  : jobId,
                profiles: profiles
            }));

            callback(null, {success: 'OK'});
        }
    }
})();