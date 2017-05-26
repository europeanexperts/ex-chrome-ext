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

            $tr.find('.jobLanguage').html(data.job_name);
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
                var sorted;

                if (err) {
                    return APP.error(err);
                }

                sorted = data.sort(function(a, b) {
                    return a.job_name.toLowerCase() > b.job_name.toLowerCase();
                });

                self.items = sorted;
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
                id             : this.$el.attr('data-id'),
                job_name       : this.$inputJobName.val(),
                region         : this.$inputRegion.val(),
                language       : this.$inputLanguage.val(),
                short_name     : this.$inputShortName.val(),
                url            : this.$inputUrl.val(),
                import_existing: this.$inputImportExisting.prop('checked')
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

                APP.notification({message: 'Job was successful saved', type: 'success', timeout: 2000}, function () {
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
            this.$inputImportExisting.prop('checked', data.import_existing);

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
            this.$exportSelectedBtn = this.$el.find('.exportSelectedBtn');
            this.$importSelectedBtn = this.$el.find('.importSelectedBtn');
            this.$deleteSelectedBtn = this.$el.find('.deleteSelectedBtn');

            this.$el.find('.searchBtn').on('click', $.proxy(this.search, this));
            this.$searchField.on('change', $.proxy(this.search, this));
            this.$searchField.on('keyup', $.proxy(this.onSearch, this));
            this.$startBtn.on('click', $.proxy(this.onStartClick, this));
            this.$pauseBtn.on('click', $.proxy(this.onPauseClick, this));
            this.$restartBtn.on('click', $.proxy(this.onRestartClick, this));

            this.$el.on('click', '.exportBtn', $.proxy(this.onExportClick, this));
            this.$el.on('click', '.deleteBtn', $.proxy(this.onDeleteClick, this));
            this.$exportSelectedBtn.on('click', $.proxy(this.onExportSelectedClick, this));
            this.$importSelectedBtn.on('click', $.proxy(this.onImportSelectedClick, this));
            this.$deleteSelectedBtn.on('click', $.proxy(this.onDeleteSelectedClick, this));
        },

        show: function (options) {
            var self = this;

            ExtensionPage.prototype.show.call(this, options);

            this.jobId = options.id;
            this.$el.addClass('hide'); // hide until loading data

            this.parseIndex = 0;
             // this.status = 'stopped';

            this.fetchAll({id: options.id}, function (err, results) {
                var job;
                var profiles;

                if (err) {
                    return APP.error(err);
                }

                job = results.job;
                profiles = results.profiles;

                self.job = job;
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

        hide: function () {
            ExtensionPage.prototype.hide.call(this);
            /*this.parseIndex = this.items.length;
             this.status = 'stopped';*/
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
            var storedProfile;
            var url;

            if (typeof profileLink !== 'string') {
                return callback({message: 'Invalid value for link'});
            }

            storedProfile = EXT_API.getProfileLocal({
                jobId: this.jobId,
                link : profileLink
            });

            if (storedProfile && storedProfile.name) {
                return callback(null, {data: storedProfile, isNew: false});
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
                    chrome.tabs.sendMessage(tab.id, {method: "profile"}, function (response) {
                        response = response || {};

                        response.isNew = true;
                        console.log("response: " + JSON.stringify(response));

                        /*
                         * response = {isNew: true, data: {{parsed profile data}}}
                         * */
                        callback(null, response);
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

                    self.parseIndex++;
                    if (res.isNew) {
                        self.onParsedProfile(profile, res.data);
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

        onParsedProfile: function (profile, data) {
            var link = profile.link;
            var $li = this.$list.find('.item[data-id="' + link + '"]');
            var $action = $li.find('.profileAction');
            var self = this;

            if (data && data.name) {
                profile.status = 1;
                profile.parsed_at = new Date();
            } else {
                profile.status = -1;
            }

            async.parallel({

                // store the profile data in localStorage:
                profile: function (cb) {
                    var _options = {
                        jobId  : self.jobId,
                        profile: data,
                        link   : profile.link
                    };

                    EXT_API.storeProfileLocal(_options, function (err, response) {
                        if (err) {
                            return cb(err);
                        }

                        console.log('>>> profile %s was stored locally', link);
                        cb(null, response);
                    });
                },

                // update the profile status in job instance:
                job: function (cb) {
                    var _options = {
                        id      : self.jobId,
                        profiles: self.items
                    };

                    EXT_API.saveJob(_options, function (err, res) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, res);
                    });
                }

            }, function (err, results) {
                var statusText;

                if (err) {
                    return APP.error(err);
                }

                if (profile.status === 1) {
                    statusText = 'Successful';
                    $action.find('[data-action="export"]').removeClass('hide');
                    $action.find('[data-action="import"]').addClass('hide');
                } else {
                    statusText = 'Unsuccessful';
                    $action.find('[data-action="export"]').addClass('hide');
                    $action.find('[data-action="import"]').removeClass('hide');
                }

                $li.find('.profileStatus').html(statusText);
                self.renderCounters();
            });
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

        importProfiles: function (links) {
            var jobJSON = this.job;

            async.eachLimit(links, 10, function (link, cb) {
                var profileJSON = EXT_API.getProfileLocal({link: link});
                var data;

                delete profileJSON.jobs; // TODO: remove
                profileJSON.linkedin_url = link;
                profileJSON.import_existing = jobJSON.import_existing || false;
                data = {
                    profile: profileJSON
                };

                EXT_API.importProfile(data, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, res);
                });

            }, function (err, res) {
                if (err) {
                    return APP.error(err);
                }

                APP.notification({message: 'Successful saved', type: 'success'});
            });
        },

        onExportClick: function (e) {
            var $tr = $(e.target).closest('.item');
            var link = $tr.attr('data-id');

            this.importProfiles([link]);
        },

        onExportSelectedClick: function () {
            var links = this.getSelectedProfiles();

            this.importProfiles(links);
        },

        onImportSelectedClick: function (e) {
            APP.showPage('importProfile');
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

        storeProfileListLocal: function (profiles) {
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

        storeProfileList: function (profiles) {
            var _options = {
                id      : this.jobId,
                profiles: profiles
            };

            EXT_API.saveJob(_options, function (err, res) {
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

        fetchAll: function (options, callback) {
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

        fetchAllLocal: function (options, callback) {
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

        normalizeProfiles: function (profiles) {
            var self = this;

            return _.reduce(profiles, function (memo, profile) {
                var now;

                if (!profile || !profile.link || profile.link === '#') {
                    return memo;
                }

                now = new Date();
                memo.push({
                    name      : profile.name,
                    job       : profile.job,
                    link      : profile.link,
                    shortName : getProfileShortName(profile.name),
                    created_at: now,
                    updated_at: now
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

        renderEmptyList: function () {
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

    var ImportProfilePage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this.$inputUrl = this.$el.find('#importUrl');
            this.$nextBtn = this.$el.find('.nextBtn');

            this.$nextBtn.on('click', $.proxy(this.onNextClick, this));

        },
        show: function (options) {
            ExtensionPage.prototype.show.call(this, options);

            self.profileJSON = null;
            this.renderProfile(); // empty profile
            this.$inputUrl.focus();
        },

        loadProfile: function (url, callback) {
            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var evt = 'complete:' + tabId;

                APP.events.off(evt);
                APP.events.on(evt, function (e, tab, info) {
                    if (tab.url !== url) {
                        return;
                    }

                    APP.events.off(evt);
                    // callback(null, 'response');

                    chrome.tabs.sendMessage(tab.id, {method: "profile"}, function (response) {
                        response = response || {};
                        console.log("response: " + JSON.stringify(response));
                        callback(null, response);
                    });
                });

                chrome.tabs.sendMessage(tabId, {method: 'loadURL', url: url}, function (response) {
                    console.log("redirect response: " + response);
                });
            });
        },

        onNextClick: function (e) {
            var url = this.$inputUrl.val().trim();
            var self = this;

            e.stopPropagation();
            e.preventDefault();

            if (this.profileJSON && this.profileJSON.url && this.profileJSON.url === url) {
                return APP.showPage('importJobListPage', {profile: this.profileJSON})
            }

            if (!url) {
                return APP.notification({message: 'Please input a valid url address', type: 'error'});
            }

            this.loadProfile(url, function (err, res) {
                var profile;

                if (err) {
                    return APP.error(err);
                }

                profile = res.data;
                profile.shortName = profile.shortName || getProfileShortName(profile.name);
                profile.url = url;
                profile.linkedin_url = url.slice(24, -1);

                self.profileJSON = profile;
                self.renderProfile();
            });
        },

        renderProfile: function () {
            var profile = this.profileJSON;
            var template = APP_TEMPLATES.getTemplate('import-profile');

            this.$el.find('#importProfileWrapper').html(template({profile: profile}));
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

            async.mapSeries(this.items, function iterator(job, cb) {
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
    APP.addPage(ImportProfilePage, {name: 'importProfile'});
    APP.addPage(ImportJobListPage, {name: 'importJobListPage'});

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
