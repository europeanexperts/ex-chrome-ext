'use strict';

/*
 https://www.linkedin.com/search/results/people/?facetGeoRegion=%5B%22in%3A0%22%5D&keywords=java&origin=FACETED_SEARCH
 * */

(function () {

    var EMAIL_REGEXP = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var PASSWORD_MIN_LENGTH = 6;

    function inherit(Child, Parent, proto) {
        proto = proto || {};
        Child.prototype = $.extend({}, Parent.prototype, proto);
    }

    function ExtensionPage(options) {
        this.name = options.name;
        this.init(options);
    }

    ExtensionPage.extend = function (props) {
        var Child = function () {
            ExtensionPage.apply(this, arguments);
        };

        inherit(Child, ExtensionPage, props);

        return Child;
    };

    ExtensionPage.prototype = {
        init               : function (options) {
            console.log('init', options.name);
            this.$el = $('.page[data-name="' + options.name + '"]');
            this.title = this.$el.attr('data-title');
        },
        show               : function () {
            var self = this;

            self.isOpened = true;
            this.$el.addClass('active');
            setTimeout(function () {
                self.onShow();
            }, 200);

        },
        onShow             : function () {
            // console.log('>>> show page %s', this.name);
        },
        hide               : function () {
            this.$el.removeClass('active');
            this.isOpened = false;
        },
        showValidationError: function (errors) {
            var names = Object.keys(errors);

            APP.notification({type: "error", message: errors[names[0]]});
        },
        loader             : function (options) {
            var status = options.status || 0; // 0 - 1;
            var message = options.message;

            if (message) {
                this.$el.find('.loaderMessage').html(message);
            }

            if (status < 1) {
                this.$el.find('.loader').removeClass('hide');
            } else {
                this.$el.find('.loader').addClass('hide');
            }

            this.$el.find('.loaderProgress').css('width', status * 100 + '%');
        },
        getLoaderMessage   : function (options) {
            return [
                '<p>',
                '<strong>Step</strong>',
                '</p>'
            ].join('');
        },
        onSelectAllClick: function(e) {
            var $btn = $(e.target);
            var isSelected = $btn.attr('data-selected');

            if (isSelected) {
                this.$list.find('.checkbox').prop('checked', false);
                $btn.html('Select all');
                $btn.attr('data-selected', null);
            } else {
                this.$list.find('.checkbox').prop('checked', true);
                $btn.html('Deselect all');
                $btn.attr('data-selected', 'on');
            }
        }
    };

    function getProfileShortName(name) {
        return name.split(' ')
            .map(function (str) {
                return str[0] || ''
            })
            .slice(0, 3)
            .join('');
    }

    var LoginPage = ExtensionPage.extend({
        init     : function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$email = this.$el.find('#email');
            this.$password = this.$el.find('#password');
            this.$el.find('.link').on('click', function (e) { // on Forgot password click
                e.stopPropagation();
                e.preventDefault();

                APP.showPage(APP.pages.forgotPassword.name);
            });

            this.$el.find('form').on('submit', $.proxy(this.onSubmit, this));
        },
        validate : function (data) {
            var errors = {};

            if (!EMAIL_REGEXP.test(data.email)) {
                errors.email = 'Invalid email';
            }

            if (data.password.length < PASSWORD_MIN_LENGTH) {
                errors.password = 'To short password';
            }

            return (Object.keys(errors).length) ? errors : null;
        },
        serialize: function () {
            return {
                email   : this.$email.val(),
                password: this.$password.val()
            };
        },
        onShow   : function () {
            ExtensionPage.prototype.onShow.call(this);
            this.$email.focus();
        },
        onSubmit : function (e) {
            var data = this.serialize();
            var validationError = this.validate(data);

            e.preventDefault();

            if (validationError) {
                return this.showValidationError(validationError);
            }

            EXT_API.login(data, function (err, res) {
                var userRoll = 'recruiter';
                var authOptions;

                if (err) {
                    return APP.error(err);
                }

                authOptions = (res && res[userRoll] && res[userRoll].basic && res[userRoll].basic) || {};
                if (!authOptions.token) {
                    return APP.notification({message: 'Unauthorized'});
                }

                localStorage.setItem('AUTH_PROFILE', JSON.stringify({name: authOptions.name, email: authOptions.email, role: authOptions.role}));
                APP.authorize(authOptions);
            });
        }
    });

    var ForgotPasswordPage = ExtensionPage.extend({
        init     : function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$email = this.$el.find('#restoreEmail');
            this.$el.find('form').on('submit', $.proxy(this.onSubmit, this));
        },
        validate : function (data) {
            var errors = {};

            if (!EMAIL_REGEXP.test(data.email)) {
                errors.email = 'Invalid email';
            }

            return (Object.keys(errors).length) ? errors : null;
        },
        serialize: function () {
            return {
                email: this.$email.val()
            };
        },
        onShow   : function () {
            ExtensionPage.prototype.onShow.call(this);
            this.$email.focus();
        },
        onSubmit : function (e) {
            var data = this.serialize();
            var validationError = this.validate(data);

            e.preventDefault();

            if (validationError) {
                return this.showValidationError(validationError);
            }

            EXT_API.forgotPassword(data, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                console.log('>>> success', res);
                alert('success');
            });
        }
    });

    var ImportJobListPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$list = this.$el.find('.items');
            this.$el.find('.importBtn').on('click', $.proxy(this.onImportClick, this));
        },

        show: function (options) {
            var self = this;

            ExtensionPage.prototype.show.call(this, options);

            console.log('>>> ImportJobListPage.show', options);

            this.profile = options.profile || null;
            this.items = [];
            this.fetchJobs(function (err, data) {
                if (err) {
                    return APP.error(err);
                }

                self.items = data;
                console.log('>>> data', data);

                self.renderList();
            });
        },

        fetchJobs: function (callback) {
            EXT_API.fetchJobList({}, function (err, jobs) {
                if (err) {
                    return callback(err);
                }

                callback(null, jobs);
            });
        },

        getSelectedIds: function () {
            return this.$list.find('.item .checkbox:checked')
                .map(function () {
                    var $chb = $(this);
                    var id = $chb.closest('.item').attr('data-id');

                    return parseInt(id, 10);
                }).toArray();
        },

        normalizeProfile: function (profile, props) {
            var now = new Date();
            var result;

            profile = profile || this.profile;
            result = {
                name      : profile.name,
                job       : profile.title,
                link      : profile.linkedin_url,
                shortName : getProfileShortName(profile.name),
                created_at: profile.created_at || now,
                updated_at: profile.updated_at || now
            };

            if (props) {
                $.extend(result, props);
            }

            return result;
        },

        onImportClick: function () {
            var ids = this.getSelectedIds();
            var profile;
            var self = this;

            async.mapSeries(this.getItems(), function iterator(job, cb) {
                var jobProfile = self.normalizeProfile(self.profile, {status: 1}); // TODO: status ???
                var jobProfiles = job.profiles;
                var profile;

                if (ids.indexOf(job.id) === -1) {
                    // The job is not in selected ids. Do not import!
                    async.setImmediate(function () {
                        cb(null, job);
                    });

                    return;
                }

                // try to save the parsed profile:
                profile = $.extend({
                    import_existing: job.import_existing
                }, self.profile);

                EXT_API.storeProfileLocal({jobId: job.id, profile: jobProfile, link: jobProfile.link}, function(err, res) {
                    console.log('>>> stored locally', jobProfile.link);
                });

                EXT_API.importProfile({profile: profile}, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    if (_.some(jobProfiles, {link: jobProfile.link})) {
                        // The profile already was added to this job. Do not import!
                        async.setImmediate(function () {
                            cb(null, job);
                        });

                        return;
                    }

                    // push the profile into job.profiles, and update the job:
                    jobProfiles.push(jobProfile);
                    EXT_API.saveJob({id: job.id, profiles: jobProfiles}, function (err, res) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, res);
                    });
                });

            }, function (err, results) {
                if (err) {
                    return APP.error(err);
                }

                self.items = results;
                APP.notification({message: 'The profile was imported successful', type: 'success'}, function() {
                    APP.showPage(APP.pages.jobs.name);
                });
            });
        },

        renderList: function (options) {
            var template;
            var listHtml;
            var items;

            options = options || {};
            items = options.items || this.items;

            /*if (!items || !items.length) {
             this.$list.html('<tr><td colspan="7">' + this.emptyListText + '</td></tr>');

             return;
             }*/

            template = APP_TEMPLATES.getTemplate('import-job-list');
            listHtml = template({items: items});

            if (options.prepend) {
                this.$list.prepend(listHtml);
            } else {
                this.$list.html(listHtml);
            }
        }
    });

    var MyProfilePage = ExtensionPage.extend({
        init: function(options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$name = this.$el.find('#my_name');
            this.$email = this.$el.find('#my_email');
        },

        show: function(options) {
            ExtensionPage.prototype.show.call(this, options);

            this.profileJSON = this.getProfile();
            if (!this.profileJSON || !this.profileJSON.email) {
                return APP.error({status: 401, responseText: 'Unauthorized'});
            }

            this.render();
        },

        getProfile: function() {
            var value = localStorage.getItem('AUTH_PROFILE');
            var profileJSON;

            if (!value) {
                return {};
            }

            try {
                profileJSON = JSON.parse(value);
            } catch(err) {
                console.error(err);
                profileJSON = {};
            }

            return profileJSON;
        },

        render: function() {
            var profileJSON = this.profileJSON;

            this.$name.val(profileJSON.name);
            this.$email.val(profileJSON.email);
        }
    });

    window.APP = {
        isAuth       : false,
        events       : $({}),
        history      : [],
        pages        : {},
        currentPage  : null,
        addPage      : function (Page, options) {
            var name = options.name;

            this.pages[name] = new Page(options);
        },
        showPage     : function (name, options) {
            var page;

            options = options || {};
            page = APP.pages[name];

            console.log('APP.showPage name=%s, opts=%s', name, JSON.stringify(options));

            if (APP.currentPage) {
                APP.currentPage.hide();
            }

            APP.$heading.html(options.title || page.title);
            APP.currentPage = page;
            APP.history.push({page: page, opts: options});
            page.show(options);
            APP.afterShowPage();
            APP.storeLastPage(page.name, options);
        },
        storeLastPage: function(name, options) {
            localStorage.setItem('currentPage', JSON.stringify({name: name, opts: options}));
        },
        retrieveLastPage: function() {
            var value = localStorage.getItem('currentPage');
            var result = null;

            if (!value) {
                return result;
            }

            try {
                result = JSON.parse(value);
            } catch(err) {
                console.warn(err);
            }

            return result;
        },
        afterShowPage: function () {
            var page = APP.currentPage;

            // add / remove class 'log-in' for '.extension-body':
            if (page.name === APP.pages.login.name || page.name === APP.pages.forgotPassword.name) {
                APP.$extensionBody.addClass('log-in');
            } else {
                APP.$extensionBody.removeClass('log-in');
            }
        },
        navBack      : function () {
            var history = APP.history;
            var prev;

            if (history.length < 2) {
                return false;
            }

            APP.history.pop(); // current page;
            prev = APP.history.pop();
            APP.showPage(prev.page.name, prev.opts);
        },
        authorize    : function (options) {
            var pageName = options.pageName || APP.pages.myProfile.name;
            var pageOptions = options.pageOptions || {};

            EXT_API.AUTH_TOKEN = options.token;
            localStorage.setItem('AUTH_TOKEN', options.token);
            // localStorage.setItem('AUTH_PROFILE', JSON.stringify({name: options.name, email: options.email, role: options.role}));

            APP.showPage(pageName, pageOptions);
            APP.isAuth = true;
            APP.$logoutBtn.removeClass('hide');
        },
        unauthorize  : function () {
            EXT_API.AUTH_TOKEN = null;
            localStorage.setItem('AUTH_TOKEN', '');
            localStorage.setItem('AUTH_PROFILE', JSON.stringify({}));
            APP.isAuth = false;
            APP.$logoutBtn.addClass('hide');
            APP.showPage(APP.pages.login.name);
        },
        run: function() {
            var authToken = localStorage.getItem('AUTH_TOKEN');

            if (!authToken) {
                return APP.unauthorize();
            }

            APP.authorize({token: authToken});
        },
        notification : function (options, callback) {
            var message = options.message || 'Some thing went wrong';
            var className = options.type || 'error';
            var timeout = options.timeout || 3000;
            var $messageText = $('#messageText');

            $messageText
                .removeClass('success')
                .removeClass('error')
                .addClass(className)
                .removeClass('hide')
                .html(message);

            setTimeout(function () {
                $messageText.addClass('hide');
                if (typeof callback === 'function') {
                    callback();
                }
            }, timeout);
        },
        error        : function (e) {
            console.log('>>> APP.error', e);

            var status;
            var _notificationOptions = {
                type: 'error'
            };

            if (e.responseJSON) {
                _notificationOptions.message = e.responseJSON.errors;
                status = e.status || 500;
            } else if (e.responseText) {
                _notificationOptions.message = e.responseText;
                status = e.status || 500;
            } else {
                _notificationOptions.message = e;
            }

            if (status === 401 || status === 403) {
                APP.notification(_notificationOptions, function() {
                    APP.unauthorize();
                });
            } else {
                APP.notification(_notificationOptions);
            }
        },
        init         : function () {
            APP.$extensionBody = $('.extensionBody');
            APP.$heading = APP.$extensionBody.find('.heading');
            APP.$settingsBtn = APP.$extensionBody.find('.settingsBtn');
            APP.$logoutBtn = APP.$extensionBody.find('.logoutBtn');
            APP.$navBackBtn = APP.$extensionBody.find('.prevBtn');

            APP.$navBackBtn.on('click', this.navBack);
            APP.$settingsBtn.on('click', function () {
                if (typeof APP.currentPage.showSettingsPage === 'function') {
                    APP.currentPage.showSettingsPage();
                }
            });
            APP.$logoutBtn.on('click', function (e) {
                console.log('>>> logout ...');
                EXT_API.logout(function (err, res) {
                    if (err) {
                        return APP.error(err);
                    }

                    APP.unauthorize();
                });
            });

        }
    };

    APP.init();

    APP.addPage(LoginPage, {name: 'login'});
    APP.addPage(ForgotPasswordPage, {name: 'forgotPassword'});
    APP.addPage(MyProfilePage, {name: 'myProfile'});

    APP.run();

})();
