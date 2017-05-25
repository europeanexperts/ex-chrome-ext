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
        }
    };

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
                if (err) {
                    return APP.error(err);
                }

                console.log('>>> success', res);
                alert('success');

                APP.authorize({token: res.recruiter.basic.token});
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

    var JobsPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);
            this.items = null;
            this.emptyListText = 'There are no saved jobs yet!';

            this.$list = this.$el.find('.jobList');
            this.$deleteSelectedBtn = this.$el.find('.deleteSelectedBtn');

            this.$el.find('.createJobBtn').on('click', function (e) {
                e.preventDefault();

                APP.showPage(APP.pages.job.name);
            });
            this.$deleteSelectedBtn.on('click', $.proxy(this.onDeleteSelectedClick, this));

            this.$el.on('click', '.editJobBtn', $.proxy(this.onSettingsClick, this));
            this.$el.on('click', '.deleteBtn', $.proxy(this.onDeleteItemClick, this));
            this.$el.on('click', '.chbWrap', function (e) {
                e.stopPropagation();
            });
            this.$el.on('click', '.item', $.proxy(this.onItemClick, this));

            APP.events.on('jobs:create', $.proxy(this.onCreateItem, this));
            APP.events.on('jobs:update', $.proxy(this.onUpdateItem, this));
        },

        show: function (options) {
            ExtensionPage.prototype.show.call(this, options);

            if (!this.items || options.reset === true) {
                this.fetchList();
            }
        },

        getSelectedIds: function () {
            return this.$list.find('.item .checkbox:checked')
                .map(function () {
                    var $chb = $(this);
                    var id = $chb.closest('.item').attr('data-id');

                    return parseInt(id, 10);
                }).toArray();
        },

        removeItems: function (ids) {
            var self = this;

            ids.forEach(function (id) {
                self.$list.find('.item[data-id="' + id + '"]').remove();
            });

            if (this.$list.find('.item').length === 0) {
                this.$list.html('<tr><td colspan="7">' + this.emptyListText + '</td></tr>');
            }
        },

        onCreateItem: function (e, data) {
            this.renderData({
                items  : [data],
                prepend: true
            });
        },

        onUpdateItem: function (e, data) {
            var $tr = this.$list.find('.item[data-id=' + data.id + ']');

            $tr.find('.jobLanguage').html(data.search);
            $tr.find('.jobRegion').html(data.region);
        },

        onItemClick: function (e) {
            var $target = $(e.target);
            var $tr = $target.closest('.item');
            var id = $tr.attr('data-id');
            var language = $tr.find('.jobLanguage').html();

            APP.showPage(APP.pages.jobProfiles.name, {
                id   : parseInt(id, 10),
                title: language
            });
        },

        onSettingsClick: function (e) {
            var $target = $(e.target);
            var id = $target.closest('.item').attr('data-id');
            var data = {
                id: id
            };

            e.stopPropagation();

            APP.showPage(APP.pages.job.name, {
                id   : id,
                title: 'Settings'
            });
        },

        onDeleteItemClick: function (e) {
            var $target = $(e.target);
            var $tr = $target.closest('.item');
            var id = $tr.attr('data-id');
            var ids = [id];
            var self = this;

            e.stopPropagation();

            EXT_API.deleteJobs(ids, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                APP.notification({message: 'success delete', type: 'success'});
                self.removeItems(ids);
            });
        },

        onDeleteSelectedClick: function () {
            var ids = this.getSelectedIds();
            var self = this;

            if (!ids.length) {
                return APP.notification({message: 'Select jobs You want to delete'});
            }

            console.log('>>> delete', ids);
            EXT_API.deleteJobs(ids, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                self.removeItems(ids);
                APP.notification({message: 'success removed', type: 'success'});
            });
        },

        fetchList: function () {
            var self = this;

            console.log('>>> fetch job list...');

            EXT_API.fetchJobList({}, function (err, data) {
                if (err) {
                    return APP.error(err);
                }

                self.items = data;
                self.renderData();
            });
        },

        renderData: function (options) {
            var template;
            var listHtml;
            var items;

            options = options || {};
            items = options.items || this.items;

            if (!items || !items.length) {
                this.$list.html('<tr><td colspan="7">' + this.emptyListText + '</td></tr>');
                this.$deleteSelectedBtn.addClass('hide');

                return;
            }

            this.$deleteSelectedBtn.removeClass('hide');
            template = APP_TEMPLATES.getTemplate('job-list');
            listHtml = template({items: items});

            if (options.prepend) {
                this.$list.prepend(listHtml);
            } else {
                this.$list.html(listHtml);
            }
        }
    });

    var JobItemPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$inputJobName = this.$el.find('input[name="job_name"]');
            this.$inputRegion = this.$el.find('input[name="region"]');
            this.$inputLanguage = this.$el.find('input[name="language"]');
            this.$inputShortName = this.$el.find('input[name="short_name"]');
            this.$inputUrl = this.$el.find('textarea[name="url"]');
            this.$inputImportExisting = this.$el.find('input[name="import_existing"]');

            this.$saveBtn = this.$el.find('.saveBtn');
            this._preData = {};

            this.$saveBtn.on('click', $.proxy(this.onSaveClick, this));
        },

        show: function (options) {
            ExtensionPage.prototype.show.call(this, options);

            if (options.id) {
                this.jobId = options.id;
                this.$saveBtn.val('Save Settings');
                this.$el.attr('data-id', options.id);
                this.renderData({}); // clear the previous data
                this.fetch();

            } else {
                this.jobId = null;
                this.$saveBtn.val('Create a Job');
                this.$el.attr('data-id', '');
                this.renderData({});
            }
        },

        fetch: function () {
            var _options = {
                id: this.jobId
            };
            var self = this;

            EXT_API.fetchJob(_options, function (err, jobData) {
                if (err) {
                    return APP.error(err);
                }

                if (!jobData || !jobData.id) {
                    return APP.notification({message: 'The job was not found'});
                }

                self.renderData(jobData);
            });
        },

        serialize: function () {
            return {
                id            : this.$el.attr('data-id'),
                job_name      : this.$inputJobName.val(),
                region        : this.$inputRegion.val(),
                language      : this.$inputLanguage.val(),
                short_name    : this.$inputShortName.val(),
                url           : this.$inputUrl.val(),
                importExisting: this.$inputImportExisting.val()
            };
        },

        validate: function (data) {
            if (!data.job_name && !data.region && !data.language && !data.url) {
                return {
                    error: 'At least one field must be non empty!'
                }
            }

            return false;
        },

        onSaveClick: function (e) {
            var data = this.serialize();
            var validationError = this.validate(data);

            e.preventDefault();

            if (validationError) {
                return this.showValidationError(validationError);
            }

            EXT_API.saveJob(data, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                APP.notification({message: 'Change are successful saved', type: 'success', timeout: 2000}, function () {
                    if (data.id) {
                        APP.showPage(APP.pages.jobs.name);
                        APP.events.trigger('jobs:update', res);
                    } else {
                        APP.showPage(APP.pages.jobs.name, {reset: true});
                        // APP.events.trigger('jobs:create', res);
                    }
                });
            });
        },

        renderData: function (data) {
            this.$el.attr('data-id', data.id);

            this.$inputJobName.val(data.job_name);
            this.$inputRegion.val(data.region);
            this.$inputLanguage.val(data.language);
            this.$inputShortName.val(data.short_name);
            this.$inputUrl.val(data.url);
            this.$inputImportExisting.val(data.importExisting);

            this._preData = data;
        }
    });

    var JobProfileListPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.items = [];

            this.$header = this.$el.find('.jobProfileHeader');
            this.$table = this.$el.find('.table');
            this.$list = this.$el.find('.jobProfileList');
            this.$searchField = this.$el.find('.searchField');
            this.$startBtn = this.$el.find('.startBtn');
            this.$pauseBtn = this.$el.find('.pauseBtn');
            this.$restartBtn = this.$el.find('.restartBtn');
            this.$deleteSelectedBtn = this.$el.find('.deleteSelectedBtn');

            this.$el.find('.searchBtn').on('click', $.proxy(this.search, this));
            this.$searchField.on('change', $.proxy(this.search, this));
            this.$searchField.on('keyup', $.proxy(this.onSearch, this));
            this.$startBtn.on('click', $.proxy(this.onStartClick, this));
            this.$pauseBtn.on('click', $.proxy(this.onPauseClick, this));
            this.$restartBtn.on('click', $.proxy(this.onRestartClick, this));

            this.$el.on('click', '.exportBtn', $.proxy(this.onExportClick, this));
            this.$el.on('click', '.deleteBtn', $.proxy(this.onDeleteClick, this));
            this.$deleteSelectedBtn.on('click', $.proxy(this.onDeleteSelectedClick, this));
        },

        show: function (options) {
            var self = this;

            ExtensionPage.prototype.show.call(this, options);
            this.jobId = options.id;
            this.$el.addClass('hide'); // hide until loading data

            this.fetchAll({id: options.id}, function (err, results) {
                var job;
                var profiles;

                if (err) {
                    return APP.error(err);
                }

                job = results.job;
                profiles = results.profiles;

                self.renderJob(job);
                self.$table.addClass('hide');
                self.$el.removeClass('hide');

                // check saved profiles:
                if (profiles && profiles.length) {
                    self.items = profiles;
                    self.renderItems({items: profiles});
                    self.loader({status: 1}); // Done, hide the progressbar
                    self.$table.removeClass('hide');

                    return; // do not fetch again !!!
                }

                self.startListParser({url: job.url}, function (err, results) {
                    var normalized;

                    if (err) {
                        return APP.error(err);
                    }

                    console.log("response: " + JSON.stringify(results));

                    normalized = self.normalizeProfiles(results);

                    self.storeProfileList(normalized);
                    self.renderItems({items: normalized});
                    self.loader({status: 1}); // Done, hide the progressbar
                    self.$table.removeClass('hide');
                    self.items = normalized;
                    self.renderCounters();
                });
            });
        },

        startListParser: function (options, callback) {
            var url = options.url;
            var self = this;

            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var evt = 'complete:' + tabId;

                var hasElements = true;
                var page = 1;
                var profileList = [];

                self.loader({message: 'Step 1/2 (Fetch list ...)', status: 0});
                console.log('tab ' + tabId + ' load...');

                async.whilst(function test() {

                    return hasElements && self.isOpened;
                }, function iterate(cb) {
                    var nextUrl = url + '&page=' + page;

                    chrome.tabs.sendMessage(tabId, {method: 'loadURL', url: nextUrl});

                    APP.events.on(evt, function (e, tab, info) {
                        console.log('>>> triggered %s for %s', evt, tab.url);

                        APP.events.off(evt);

                        chrome.tabs.sendMessage(tab.id, {method: 'jobs'}, function (response) {
                            console.log("response: " + JSON.stringify(response));

                            var count = Math.ceil(response.data.total / 10);

                            if (!response.data || !response.data.profiles || !response.data.profiles.length) {
                                hasElements = false;
                            }

                            self.loader({
                                message: 'Fetch list (' + page + '/' + count + ')',
                                status : page / count
                            });

                            page++;
                            if (page > count) { // profile / page
                                hasElements = false;
                            }

                            profileList = profileList.concat(response.data.profiles);
                            cb();
                        });
                    });

                }, function (err, results) {
                    if (err) {
                        return callback(err);
                    }

                    console.log('>>> doWhile results', profileList);
                    callback(null, profileList);
                });
            });
        },

        search: function () {
            var term = this.$searchField.val();
            var regExp;
            var filtered;

            if (!term) {
                filtered = this.items;
            } else {
                regExp = new RegExp(term, 'ig');
                filtered = _.filter(this.items, function (item) {
                    return regExp.test(item.name);
                });
            }

            this.renderItems({items: filtered});
        },

        onSearch: function (e) {
            if (e.which === 13) {
                this.search();
            }
        },

        getSelectedProfiles: function () {
            return this.$list.find('.item .checkbox:checked')
                .map(function () {
                    var $chb = $(this);

                    return $chb.closest('.item').attr('data-id'); // link
                }).toArray();
        },

        deleteProfiles: function (options, callback) {
            var links = options.links;
            var profiles = _.filter(this.items, function (item) {
                return links.indexOf(item.link) === -1;
            });
            var saveData = {
                id      : this.jobId,
                profiles: profiles
            };
            var self = this;

            EXT_API.saveJob(saveData, function (err, res) {
                if (err) {
                    return callback(err);
                }

                self.items = profiles;
                self.$list.find('.item').each(function () {
                    var $li = $(this);
                    var link = $li.attr('data-id');

                    if (links.indexOf(link) !== -1) { // need to remove
                        $li.remove();
                    }
                });

                if (!profiles.length) {
                    self.renderEmptyList();
                }
                self.renderCounters();
            });
        },

        __parseProfile: function (options, callback) {
            console.log('>>> parseProfile', options);

            var url = 'https://www.linkedin.com/in/' + 'tetiana-bysaha-637a427b';
            var _options = {
                //tabId: this.profileTabId || null,
                // url  : 'https://www.linkedin.com/in/' + options.link
                url: url
            };

            var self = this;

            chrome.tabs.create({url: url, active: false}, function (tab) {
                chrome.tabs.onUpdated.addListener(function (tabId, info, updTab) {
                    if (updTab.url === url && tabId === tab.id && (info.status === "complete")) {
                        console.log('... complete');
                        //onCompleteTab(tabId, info);

                        chrome.tabs.sendMessage(tab.id, {method: "profile"}, function (response) {
                            console.log("response: " + JSON.stringify(response));

                            //chrome.tabs.remove(tabId, function() {
                            callback(null, options); // TODO: !!!
                            //});
                        });
                    }
                });
            });

            /*APP_HELPERS.prepareParseProfile(_options, function(err, res) {
             if (err) {
             return callback(err);
             }

             console.log('>>> res', res);
             //self.profileTabId = res.tabId;

             setTimeout(function () {
             callback(null, options); // TODO: !!!
             }, 200);
             });*/
        },

        parseProfile: function (options, callback) {
            var profileLink = options.link;
            var url;

            if (typeof profileLink !== 'string') {
                return callback({message: 'Invalid value for link'});
            }

            url = 'https://www.linkedin.com' + profileLink;
            console.log('>>> parseProfile', options);

            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var evt = 'complete:' + tabId;

                APP.events.on(evt, function (e, tab, info) {
                    if (tab.url !== url) {
                        return;
                    }

                    APP.events.off(evt);
                    console.log('>>> send message to ', tab.id);

                    chrome.tabs.sendMessage(tab.id, {method: "profile"}, function (response) {
                        console.log("response: " + JSON.stringify(response));

                        callback(null, response || {});
                    });
                });

                chrome.tabs.sendMessage(tabId, {method: 'loadURL', url: url}, function (response) {
                    console.log("redirect response: " + response);
                });
            });
        },

        parseProfiles: function () {
            this.parseIndex = this.parseIndex || 0;
            var count = this.items.length;
            var self = this;

            console.log('>>> starting parser... from=%d, total=%d', self.parseIndex, count);

            self.loader({
                message: 'Profile ...',
                status : 0
            });

            async.whilst(function test() {
                return (self.parseIndex < count) && (self.status === 'started');
            }, function iterate(cb) {
                var profile = self.items[self.parseIndex];

                self.loader({
                    message: 'Profile ' + self.parseIndex + '/' + count,
                    status : self.parseIndex / count
                });

                console.log('>>> try to parse', self.parseIndex);
                self.parseProfile(profile, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    console.log('>>> res', res);
                    self.parseIndex++;

                    if (res) {
                        self.onParsedProfile(profile.link, res.data);
                        EXT_API.storeProfile({
                            jobId  : self.jobId,
                            profile: res,
                            link   : profile.link
                        }, function (err, response) {
                            if (err) {
                                return APP.error(err);
                            }

                            console.log('>>> profile %s was imported successful', profile.link);
                        });
                    } else {
                        self.onParsedProfile(profile.link, false);
                    }

                    cb(null, res);
                });

            }, function (err) {
                if (err) {
                    APP.error(err);
                }

                console.log('>>> this.parseIndex', self.parseIndex);
                if (self.parseIndex < count) {
                    console.log('>>> PAUSED');

                    /*self.$startBtn.addClass('hide');
                     self.$restartBtn.addClass('hide');
                     self.$pauseBtn.removeClass('hide');*/
                } else {
                    console.log('>>> DONE');

                    setTimeout(function () {
                        self.loader({
                            message: 'Done',
                            status : 1
                        });
                    }, 200);

                    /*self.$startBtn.removeClass('hide');
                     self.$pauseBtn.addClass('hide');*/
                }
                self.$restartBtn.removeClass('hide');
            });
        },

        onParsedProfile: function (link, profile) {
            var $li = this.$list.find('.item[data-id="' + link + '"]');
            var $action = $li.find('.profileAction');
            var statusText;

            if (profile && profile.name) {
                statusText = 'Successful';
                $action.find('[data-action="export"]').removeClass('hide');
                $action.find('[data-action="import"]').addClass('hide');
            } else {
                statusText = 'Unsuccessful';
                $action.find('[data-action="export"]').addClass('hide');
                $action.find('[data-action="import"]').removeClass('hide');
            }

            $li.find('.profileStatus').html(statusText);
        },

        onStartClick: function () {
            this.$startBtn.addClass('hide');
            this.$restartBtn.addClass('hide');
            this.$pauseBtn.removeClass('hide');

            console.log('>>> start');

            this.status = 'started';
            this.parseProfiles();
        },

        onPauseClick: function () {
            this.$startBtn.removeClass('hide');
            this.$pauseBtn.addClass('hide');
            //this.$restartBtn.removeClass('hide'); // hide class will be removed on parse callback

            console.log('>>> pause');

            this.status = 'paused';
        },

        onRestartClick: function () {
            this.status = 'restarted';
            this.parseIndex = 0;
            this.onStartClick();
        },

        onExportClick: function (e) {
            var $tr = $(e.target).closest('.item');
            var link = $tr.attr('data-id');
            var key = 'profile_' + link;

            var profileStr = localStorage.getItem(key);

            APP.notification({message: profileStr, type: 'success', timeout: 5000}); // TODO
        },

        onDeleteClick: function (e) {
            var $li = $(e.target).closest('.item');
            var link = $li.attr('data-id');
            var links = [link];

            this.deleteProfiles({links: links}, function (err) {
                if (err) {
                    return APP.error(err);
                }

                APP.notification({message: 'Successful removed', type: 'success'});
            });
        },

        onDeleteSelectedClick: function () {
            var links = this.getSelectedProfiles();

            if (!links.length) {
                return APP.notification({message: 'Select profile You want to delete'});
            }

            this.deleteProfiles({links: links}, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                APP.notification({message: 'Successful removed', type: 'success'});
            });
        },

        storeProfileList: function (profiles) {
            var _options = {
                job_id  : this.jobId,
                profiles: profiles
            };

            EXT_API.saveJobProfiles(_options, function (err, res) {
                if (err) {
                    return APP.error(err);
                }
            });
        },

        showSettingsPage: function () {
            APP.showPage(APP.pages.job.name, {
                id   : this.jobId,
                title: 'Settings'
            });
        },

        __fetchAll: function (options, callback) {
            var jobId = options.id;
            var _options = {
                id: jobId
            };

            EXT_API.fetchJob(_options, function (err, res) {
                var result;

                if (err) {
                    return callback(err);
                }

                if (!res || !res.id) {
                    return callback({message: 'The job was not found'});
                }

                result = {
                    job     : res,
                    profiles: res.profiles || []
                };

                callback(null, result);
            });
        },

        fetchAll: function (options, callback) {
            var jobId = options.id;

            async.parallel({

                job: function (cb) {
                    var _options = {
                        id: jobId
                    };

                    EXT_API.fetchJob(_options, function (err, res) {
                        if (err) {
                            return cb(err);
                        }

                        if (!res || !res.id) {
                            return cb({message: 'The job was not found'});
                        }

                        cb(null, res);
                    });
                },

                profiles: function (cb) {
                    var _options = {
                        job_id: jobId
                    };

                    EXT_API.fetchJobProfilesLocal(_options, function (err, res) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, res || []);
                    });

                }
            }, callback);
        },

        getProfileShortName: function (name) {
            return name.split(' ')
                .map(function (str) {
                    return str[0] || ''
                })
                .slice(0, 3)
                .join('');
        },

        normalizeProfiles: function (profiles) {
            var self = this;

            return _.reduce(profiles, function (memo, profile) {
                if (!profile || !profile.link || profile.link === '#') {
                    return memo;
                }

                memo.push({
                    name     : profile.name,
                    job      : profile.job,
                    link     : profile.link,
                    shortName: self.getProfileShortName(profile.name)
                });

                return memo;
            }, []);
        },

        generateListTemplate: function (items) {
            var template = APP_TEMPLATES.getTemplate('job-profiles-list');
            var templateOptions = {
                items: items.map(function (item, index) {
                    item.cid = new Date().valueOf() + '_' + index;

                    return item;
                })
            };

            return template(templateOptions);
        },

        renderEmptyList: function() {
            this.$list.html('<tr><td colspan="8">There are no data</td></td></tr>');
        },

        renderItems: function (options) {
            var profiles = options.items;
            var html;

            if (!profiles || !profiles.length) {
                html = '<tr><td colspan="7">There are no data</td></td></tr>';
            } else {
                html = this.generateListTemplate(profiles);
            }

            this.$list.html(html);
            this.renderCounters();
        },

        renderCounters: function () {
            var counts = {
                "-1": 0, // unsuccessful,
                "0" : 0, // pending,
                "1" : 0  // successful
            };

            this.items.forEach(function (profile) {
                var _status = profile.status || 0;

                counts[_status] += 1;
            });

            this.$header.find('.countSuccessful').html(counts["1"]);
            this.$header.find('.countUnSuccessful').html(counts["-1"]);
            this.$header.find('.countPending').html(counts["0"]);
        },

        renderJob: function (job) {
            var _date = new Date(job.updated_at);

            this.$header.find('.jobProfileRegion').html(job.region || '');
            this.$header.find('.jobProfileDate').html(_date.toLocaleDateString());

            this.renderCounters();
        }
    });

    window.APP = {
        // REQUESTS    : window.EXT_API,
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
        },
        afterShowPage: function () {
            var page = APP.currentPage;

            // add / remove class 'log-in' for '.extension-body':
            if (page.name === APP.pages.login.name || page.name === APP.pages.forgotPassword.name) {
                APP.$extensionBody.addClass('log-in');
            } else {
                APP.$extensionBody.removeClass('log-in');
            }

            // show / hide settings button:
            if (page.name === APP.pages.jobProfiles.name) {
                APP.$settingsBtn.removeClass('hide');
            } else {
                APP.$settingsBtn.addClass('hide');
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
            EXT_API.AUTH_TOKEN = options.token;
            APP.showPage(APP.pages.jobs.name);
            APP.isAuth = true;
            APP.$logoutBtn.removeClass('hide');
        },
        unauthorize  : function () {
            EXT_API.AUTH_TOKEN = null;
            APP.isAuth = false;
            APP.$logoutBtn.addClass('hide');
            APP.showPage(APP.pages.login.name);
        },
        notification : function (options, callback) {
            var message = options.message || 'Some thing went wrong';
            var className = options.type || 'error';
            var timeout = options.timeout || 3000;
            // alert(message);

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

            var message;

            if (e.responseJSON) {
                message = e.responseJSON.errors;
            } else if (e.responseText) {
                message = e.responseText;
            } else {
                message = e;
            }

            APP.notification({
                type   : 'error',
                message: message
            });
        },
        init         : function () {
            APP.$extensionBody = $('.extensionBody');
            APP.$heading = APP.$extensionBody.find('.heading');
            //APP.$logoutBtn = APP.$extensionBody.find('.logoutBtn');
            APP.$settingsBtn = APP.$extensionBody.find('.settingsBtn');
            APP.$logoutBtn = APP.$extensionBody.find('.logoutBtn');
            APP.$extensionBody.find('.prevBtn').on('click', this.navBack);

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
    APP.addPage(JobsPage, {name: 'jobs'});
    APP.addPage(JobItemPage, {name: 'job'});
    APP.addPage(JobProfileListPage, {name: 'jobProfiles'});

    APP.showPage('jobs');

    /*chrome.runtime.onMessage.addListener(function(request, sender) {
     console.log('>>> popup.js onMessage', arguments);

     if (request.action == "getSource") {
     message.innerText = request.source;
     }
     });

     chrome.runtime.sendMessage({
     action: "getSource",
     source: 'DOMtoString(document)'
     });*/

    chrome.tabs.query({active: true}, function (tabs) {
        var tabId = tabs[0].id;

        chrome.tabs.onUpdated.addListener(function (_tabId, info, updTab) {
            var evt;

            if (tabId === _tabId && info.status === "complete") {

                //evt = 'complete:' + tabId + ':url';
                evt = 'complete:' + tabId;
                APP.events.trigger(evt, [updTab, info]);
            }
        });

    });

})();
