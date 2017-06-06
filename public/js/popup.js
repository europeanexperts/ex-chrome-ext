'use strict';

/*
 https://www.linkedin.com/search/results/people/?facetGeoRegion=%5B%22in%3A0%22%5D&keywords=java&origin=FACETED_SEARCH
 * */

(function () {

    var LINKEDIN_HOST = 'https://www.linkedin.com';
    var EMAIL_REGEXP = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    var PASSWORD_MIN_LENGTH = 6;
    var PARSE_STATUSES = {
        CREATED  : 'created',
        STARTED  : 'started',
        PAUSED   : 'paused',
        RESTARTED: 'restarted',
        STOPPED  : 'stopped'
    };

    var RUNTIME_METHODS = {
        PARSE_JOBS         : 'jobs',
        PARSE_PROFILE      : 'profile',
        LOAD_URL           : 'loadURL',
        CHANGE_PARSE_STATUS: 'changeParseStatus'
    };

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
                var authToken;

                if (err) {
                    return APP.error(err);
                }

                authToken = res && res.recruiter && res.recruiter.basic && res.recruiter.basic.token;

                if (!authToken) {
                    return APP.notification({message: 'Unauthorized'});
                }

                APP.authorize({token: authToken});
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
            this.$selectAllBtn = this.$el.find('.selectAllBtn');
            this.$deleteSelectedBtn = this.$el.find('.deleteSelectedBtn');

            this.$el.find('.createJobBtn').on('click', function (e) {
                e.preventDefault();

                APP.showPage(APP.pages.job.name);
            });

            this.$selectAllBtn.on('click', $.proxy(this.onSelectAllClick, this));
            this.$deleteSelectedBtn.on('click', $.proxy(this.onDeleteSelectedClick, this));

            this.$el.on('click', '.sortable', $.proxy(this.onSortClick, this));
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
            var self = this;

            ExtensionPage.prototype.show.call(this, options);

            if (!this.items || options.reset === true) {
                this.fetchList(function(err, data) {
                    if (err) {
                        return APP.error(err);
                    }

                    self.items = data;
                    self.renderData();
                });
            }
        },

        showItemById: function(id) {
            this.$list.find('.item[data-id="' + id + '"]').click();
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

        onSortClick: function(e) {
            var $sortable = $(e.target).closest('.sortable');
            var sortBy = $sortable.attr('data-sort-by');
            var order = $sortable.attr('data-order');
            var sorted;

            if(order === 'asc') {
                $sortable.attr('data-order', 'desc');
            } else {
                $sortable.attr('data-order', 'asc');
            }

            sorted = this.items.sort(function(a, b) {
                if (order === 'asc') {
                    return a[sortBy] <= b[sortBy];
                }

                return a[sortBy] >= b[sortBy]; // DESC
            });

            this.items = sorted;
            this.renderData({items: sorted});
        },

        onCreateItem: function (e, data) {
            this.renderData({
                items  : [data],
                prepend: true
            });
        },

        onUpdateItem: function (e, data) {
            var $tr = this.$list.find('.item[data-id=' + data.id + ']');

            if (data.job_name) {
                $tr.find('.jobLanguage').html(data.job_name);
            }

            if (data.region) {
                $tr.find('.jobRegion').html(data.region);
            }

            if (data.short_name) {
                $tr.find('.avatar').html(data.short_name);
            }

            if (Array.isArray(data.profiles)) {
                $tr.find('.jobProfilesCount').html(data.profiles.length);
            }
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

        fetchList: function (callback) {
            console.log('>>> fetch job list...');

            EXT_API.fetchJobList({}, function (err, data) {
                var sorted;

                if (err) {
                    return callback(err);
                }

                sorted = data.sort(function(a, b) {
                    return a.created_at <= b.created_at;
                });

                callback(null, sorted);
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
                        // APP.showPage(APP.pages.jobs.name, {reset: true});
                        APP.events.trigger('jobs:create', res);
                        APP.showPage(APP.pages.jobProfiles.name, {
                            id   : res.id,
                            title: res.language
                        });
                    }
                });
            });
        },

        renderData: function (data) {
            var importExisting = (typeof data.import_existing === 'boolean') ? data.import_existing : true;

            this.$el.attr('data-id', data.id);

            this.$inputJobName.val(data.job_name);
            this.$inputRegion.val(data.region);
            this.$inputLanguage.val(data.language);
            this.$inputShortName.val(data.short_name);
            this.$inputUrl.val(data.url);
            this.$inputImportExisting.prop('checked', importExisting);

            this._preData = data;
        }
    });

    var JobProfileListPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            this._items = [];
            this._status = PARSE_STATUSES.STOPPED;

            this.$header = this.$el.find('.jobProfileHeader');
            this.$table = this.$el.find('.table');
            this.$list = this.$el.find('.jobProfileList');
            this.$searchField = this.$el.find('.searchField');
            this.$startBtn = this.$el.find('.startBtn');
            this.$pauseBtn = this.$el.find('.pauseBtn');
            this.$restartBtn = this.$el.find('.restartBtn');
            this.$selectAllBtn = this.$el.find('.selectAllBtn');
            this.$exportSelectedBtn = this.$el.find('.exportSelectedBtn');
            this.$importSelectedBtn = this.$el.find('.importSelectedBtn');
            this.$deleteSelectedBtn = this.$el.find('.deleteSelectedBtn');

            this.$el.find('.searchBtn').on('click', $.proxy(this.search, this));
            this.$selectAllBtn.on('click', $.proxy(this.onSelectAllClick, this));
            this.$searchField.on('change', $.proxy(this.search, this));
            this.$searchField.on('keyup', $.proxy(this.onSearch, this));
            this.$startBtn.on('click', $.proxy(this.onStartClick, this));
            this.$pauseBtn.on('click', $.proxy(this.onPauseClick, this));
            this.$restartBtn.on('click', $.proxy(this.onRestartClick, this));

            this.$el.on('click', '.sortable', $.proxy(this.onSortClick, this));
            this.$el.on('click', '.exportBtn', $.proxy(this.onExportClick, this));
            this.$el.on('click', '.deleteBtn', $.proxy(this.onDeleteClick, this));

            this.$exportSelectedBtn.on('click', $.proxy(this.onExportSelectedClick, this));
            this.$importSelectedBtn.on('click', $.proxy(this.onImportSelectedClick, this));
            this.$deleteSelectedBtn.on('click', $.proxy(this.onDeleteSelectedClick, this));
        },

        show: function (options) {
            var self = this;
            var _status;

            ExtensionPage.prototype.show.call(this, options);
            this.$el.addClass('hide'); // hide until loading data

            // clear the Select all button previous state:
            this.$selectAllBtn.html('Select all');
            this.$selectAllBtn.attr('data-selected', null);

            _status = self.getParseStatus({jobId: options.id});
            this.jobId = options.id;
            this.parseStatus(_status.status || PARSE_STATUSES.CREATED);
            this.setItems([], {trigger: false});
            this.$el.find('.sortable').attr('data-order', 'asc');

            if (_status.status === PARSE_STATUSES.STARTED || _status.status === PARSE_STATUSES.PAUSED) {
                this.$startBtn.find('span').html('Continue');
                this.parsePageIndex = _status.page || 1;
            } else {
                this.$startBtn.find('span').html('Start');
                this.parsePageIndex = 1;
            }

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

                self.setItems(profiles);
                self.renderItems({items: profiles});
                self.loader({status: 1}); // Done, hide the progressbar
                self.$table.removeClass('hide');
            });
        },

        hide: function() {
            var currentStatus = this.parseStatus();

            if (currentStatus === PARSE_STATUSES.STARTED || currentStatus === PARSE_STATUSES.RESTARTED) {
                this.onPauseClick();
            }

            ExtensionPage.prototype.hide.call(this);
        },

        setItems: function(items, options) {
            var mappedItems = EXT_API.mapLocalProfiles(items);

            this._items = mappedItems;

            if (!options || options.trigger !== false) {
                APP.events.trigger('jobs:update', {id: this.jobId, profiles: mappedItems});
            }
        },

        getItems: function() {
            return this._items;
        },

        _getStatus: function() {
            return this._status || PARSE_STATUSES.STOPPED;
        },

        _setStatus: function(value) {
            this._status = value;
        },

        onChangeParseStatus: function(_status) {
            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var data = {
                    method: RUNTIME_METHODS.CHANGE_PARSE_STATUS,
                    status: _status
                };

                chrome.tabs.sendMessage(tabId, data, function(res) {
                    console.log(res);
                });
            });
        },

        parseStatus: function(value) {
            if (value === undefined) {
                return this._getStatus();
            }

            this._setStatus(value);
            this.onChangeParseStatus(value);
        },

        appendProfiles: function(normalized, options) {
            var newProfiles;
            var totalCount;

            options = options || {};
            newProfiles = this.filterNewItems(normalized);
            totalCount = options.totalCount;

            if (!newProfiles.length) {
                return false;
            }

            this.storeProfileList(newProfiles, {totalCount: totalCount});
            this.renderItems({items: newProfiles, append: true, totalCount: totalCount});
            this.$table.removeClass('hide');
        },

        getParseStatus: function(options) {
            var jobId = (options && options.jobId) || this.jobId;
            var name = 'job_profile_statuses_' + jobId;
            var result;

            try {
                result = JSON.parse(localStorage.getItem(name));
            } catch (e) {
                console.warn(e);
            }

            return result || {};
        },

        storeParseStatus: function(options) {
            var page = options.page;
            var count = options.count;
            var index = options.index;

            var name = 'job_profile_statuses_' + this.jobId;
            var params = {
                status: this.parseStatus(),
                index : index,
                count : count,
                page  : page
            };

            localStorage.setItem(name, JSON.stringify(params));
        },

        clearProfileStatus: function() {
            var name = 'job_profile_statuses_' + this.jobId;

            localStorage.removeItem(name);
        },

        startListParser: function (options, callback) {
            var url = options.url;
            var self = this;

            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var evt = 'complete:' + tabId;

                var hasElements = true;
                var page = self.parsePageIndex || 1;
                var count;

                function isRun() {
                    return hasElements && self.isOpened && [PARSE_STATUSES.STARTED, PARSE_STATUSES.RESTARTED].indexOf(self.parseStatus()) !== -1 ;
                }

                // var profileList = [];
                self.loader({message: 'Fetch list ...', status: 0});
                self.status = 'started';

                async.whilst(function test() {
                    // return hasElements && self.isOpened && self.status === 'started';
                    return isRun();

                }, function iterate(cb) {
                    var nextUrl = url + '&page=' + self.parsePageIndex;

                    chrome.tabs.sendMessage(tabId, {method: RUNTIME_METHODS.LOAD_URL, url: nextUrl});

                    APP.events.on(evt, function (e, tab, info) {
                        APP.events.off(evt);

                        chrome.tabs.sendMessage(tab.id, {method: RUNTIME_METHODS.PARSE_JOBS}, function (response) {
                            var profileList;
                            var _total;
                            var normalized;

                            if (response && response.data) {
                                _total = response.data.total || 0;
                                profileList = response.data.profiles || [];
                            } else {
                                _total = 0;
                                profileList = [];
                            }

                            count = Math.ceil(_total / 10);
                            self.storeParseStatus({
                                count: count,
                                page : self.parsePageIndex
                            });

                            if (!profileList.length) {
                                hasElements = false;
                            }

                            self.loader({
                                message: 'Fetch list (' + self.parsePageIndex + '/' + count + ')',
                                status : self.parsePageIndex / count
                            });

                            normalized = self.normalizeProfiles(profileList);
                            self.appendProfiles(normalized, {totalCount: _total});

                            async.mapSeries(normalized, function(profileData, mapCb) {
                                if (!isRun()) {

                                    console.warn('The parse process was canceled');
                                    return mapCb(null, null);
                                }

                                self.parseProfile(profileData, function(err, res) {
                                    if (err) {
                                        if (err.name === 'ParseStatusError') {
                                            console.warn(err.message);
                                            return mapCb(null, null);

                                        }

                                        return mapCb(err);
                                    }

                                    console.log('>>> res', res);
                                    if (!res.isNew) {
                                        mapCb(null, res.data);
                                    }

                                    self.onParsedProfile(profileData, res.data, function(err) {
                                        if (err) {
                                            console.error(err);
                                            APP.error(err);
                                        }

                                        mapCb(null, res.data);
                                    });

                                });

                            }, function(err, parsedProfiles) {
                                if (err) {
                                    return cb(err);
                                }

                                self.parsePageIndex++;
                                if (self.parsePageIndex > count) { // profile / page
                                    hasElements = false;
                                }

                                cb();
                            });
                        });
                    });

                }, function (err, results) {
                    var _parseStatus = self.parseStatus();

                    if (err) {
                        return callback(err);
                    }

                    if (_parseStatus === PARSE_STATUSES.STARTED) {
                        self.parseStatus(PARSE_STATUSES.STOPPED);
                        self.$startBtn.removeClass('hide').find('span').html('Finished');
                        self.$pauseBtn.addClass('hide');

                        setTimeout(function() {
                            self.loader({message: 'Done successful',status : 1});
                        }, 200);

                    } else if (_parseStatus === PARSE_STATUSES.PAUSED) {
                        self.loader({message: '',status : 1}); // hide the progressbar
                    }

                    self.$restartBtn.removeClass('hide');
                    self.storeParseStatus({
                        count: count,
                        page : self.parsePageIndex
                    });

                    callback(null, results);
                });
            });
        },

        onSortClick: function(e) {
            var $sortable = $(e.target).closest('.sortable');
            var sortBy = $sortable.attr('data-sort-by');
            var order = $sortable.attr('data-order');
            var sorted;

            if(order === 'asc') {
                $sortable.attr('data-order', 'desc');
            } else {
                $sortable.attr('data-order', 'asc');
            }

            sorted = this.getItems().sort(function(a, b) {
                if (order === 'asc') {
                    return a[sortBy] <= b[sortBy];
                }

                return a[sortBy] >= b[sortBy]; // DESC
            });

            this.setItems(sorted);
            this.renderItems({items: sorted});
        },

        search: function () {
            var term = this.$searchField.val();
            var regExp;
            var filtered;

            if (!term) {
                filtered = this.getItems();
            } else {
                regExp = new RegExp(term, 'ig');
                filtered = _.filter(this.getItems(), function (item) {
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
            var profiles = _.filter(this.getItems(), function (item) {
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

                self.setItems(profiles);
                self.$list.find('.item').each(function () {
                    var $li = $(this);
                    var link = $li.attr('data-id');

                    if (links.indexOf(link) !== -1) { // need to remove
                        $li.remove();
                    }
                });

                self.parsePageIndex = 1; // the items are changed the parse need to start from page=1
                self.clearProfileStatus();

                if (!profiles.length) {
                    self.renderItems({items: []}); // Show 'There are no data' message and update the counters;
                } else {
                    self.renderCounters();         // Update the counters only;
                }
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
            var self = this;
            var storedProfile;
            var url;

            if (typeof profileLink !== 'string') {
                return callback({message: 'Invalid value for link'});
            }

            this.loader({
                message: 'Parse <b>' + options.name + '</b> ...'
            });

            storedProfile = EXT_API.getProfileLocal({link : profileLink});
            /*if (storedProfile && storedProfile.name) {
                return callback(null, {data: storedProfile, isNew: false});
            }*/

            url = LINKEDIN_HOST + profileLink;
            console.log('>>> parseProfile', options);

            chrome.tabs.query({active: true}, function (tabs) {
                var tabId = tabs[0].id;
                var evt = 'complete:' + tabId;

                APP.events.on(evt, function (e, tab, info) {
                    if (tab.url !== url) {
                        return;
                    }

                    APP.events.off(evt);
                    chrome.tabs.sendMessage(tab.id, {method: RUNTIME_METHODS.CHANGE_PARSE_STATUS, status: self.parseStatus()});
                    chrome.tabs.sendMessage(tab.id, {method: RUNTIME_METHODS.PARSE_PROFILE}, function (response) {
                        if (response.err) {
                            return callback(response.err);
                        }

                        response = response || {};
                        response.data = response.data || {};
                        response.data.is_exported = (storedProfile && storedProfile.is_exported) || false;
                        response.isNew = true;

                        console.log("response: " + JSON.stringify(response));

                        /*
                         * response = {isNew: true, data: {{parsed profile data}}}
                         * */
                        callback(null, response);
                    });
                });

                chrome.tabs.sendMessage(tabId, {method: RUNTIME_METHODS.LOAD_URL, url: url}, function (response) {
                    console.log("redirect response: " + response);
                });
            });
        },

        onParsedProfile: function (profile, data, callback) {
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
                        profiles: self.getItems()
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
                    return callback(err);
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

                callback(null, results);
            });
        },

        onStartClick: function () {
            this.$startBtn.addClass('hide');
            this.$restartBtn.addClass('hide');
            this.$pauseBtn.removeClass('hide');
            var self = this;

            if (this.parseStatus() === PARSE_STATUSES.PAUSED && this.parsePageIndex > 1) {
                this.parsePageIndex--;
            }

            this.parseStatus(PARSE_STATUSES.STARTED);
            this.startListParser({url: this.job.url}, function (err, results) {
                if (err) {
                    return APP.error(err);
                }

                if (self.parseStatus() === PARSE_STATUSES.STOPPED) {
                    self.loader({status: 1});
                }
            });
        },

        onPauseClick: function () {
            this.$startBtn.removeClass('hide').find('span').html('Continue');
            this.$pauseBtn.addClass('hide');
            //this.$restartBtn.removeClass('hide'); // hide class will be removed on parse callback

            this.loader({message: 'Close the current process ...'});
            this.parseStatus(PARSE_STATUSES.PAUSED);
        },

        onRestartClick: function () {
            this.parseStatus(PARSE_STATUSES.RESTARTED);

            this.setItems([]);
            this.renderItems({items: []});

            this.parsePageIndex = 0;
            this.onStartClick();
        },

        importProfiles: function (links) {
            var jobJSON = this.job;
            var $list = this.$list;

            async.eachLimit(links, 10, function (link, cb) {
                var profileJSON = EXT_API.getProfileLocal({link: link});
                var data;

                delete profileJSON.jobs; // TODO: remove
                profileJSON.import_existing = jobJSON.import_existing || false;
                data = {
                    profile: profileJSON
                };

                EXT_API.importProfile(data, function (err, res) {
                    if (err) {
                        return cb(err);
                    }

                    $list.find('.item[data-id="' + link + '"]').addClass('exported');
                    EXT_API.setProfileExported({link: link});
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

        filterNewItems: function(profiles) {
            var jobProfileLinks = _.map(this.getItems(), 'link');
            var newProfiles = _.filter(profiles, function(item) {
                return jobProfileLinks.indexOf(item.link) === -1;
            });

            return newProfiles;
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

        storeProfileList: function (newProfiles, options) {
            var _options;

            options = options || {};

            this.setItems(this.getItems().concat(newProfiles));
            this.job.profiles = this.getItems();

            _options = {
                id        : this.job.id,
                profiles  : this.job.profiles,
                total_count: options.totalCount // or undefined
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

        renderItems: function (options) {
            var profiles = options.items;
            var totalCount = options.totalCount;
            var counterOptions = {
                totalCount: totalCount
            };

            var template;
            var templateOptions;
            var html;
            var thisItems = this.getItems();

            if (!thisItems || !thisItems.length) {
                html = '<tr class="noItems"><td colspan="8">There are no data</td></td></tr>';
                this.$list.html(html);
                this.renderCounters(counterOptions);

                return;
            } else {
                this.$list.find('.noItems').remove();
            }

            template = APP_TEMPLATES.getTemplate('job-profiles-list');
            templateOptions = {
                items: profiles.map(function (item, index) {
                    item.cid = new Date().valueOf() + '_' + index;

                    return item;
                })
            };

            html = template(templateOptions);
            if (options.append) {
                this.$list.append(html);
            } else {
                this.$list.html(html);
            }

            this.renderCounters(counterOptions);
        },

        renderCounters: function (options) {
            var counts = {
                "-1": 0, // unsuccessful,
                "0" : 0, // pending,
                "1" : 0  // successful
            };

            if (options && options.totalCount !== undefined) {
                this.$header.find('.countTotal').html(options.totalCount);
            }

            this.getItems().forEach(function (profile) {
                var _status = profile.status || 0;

                counts[_status] += 1;
            });

            this.$header.find('.countSuccessful').html(counts["1"]);
            this.$header.find('.countUnSuccessful').html(counts["-1"]);
            this.$header.find('.countPending').html(counts["0"]);
        },

        renderJob: function (job) {
            var date = new Date(job.updated_at);
            var totalCount = job.total_count || '-';

            this.$header.find('.jobProfileRegion').html(job.region || '');
            this.$header.find('.jobProfileDate').html(date.toLocaleDateString());

            this.renderCounters({totalCount: totalCount});
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

                chrome.tabs.sendMessage(tabId, {method: RUNTIME_METHODS.LOAD_URL, url: url}, function (response) {
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

            // show / hide settings button:
            if (page.name === APP.pages.jobProfiles.name) {
                APP.$settingsBtn.removeClass('hide');
            } else {
                APP.$settingsBtn.addClass('hide');
            }

            if (page.name === APP.pages.jobs.name) {
                APP.$navBackBtn.addClass('hide');
            } else {
                APP.$navBackBtn.removeClass('hide');
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
            var pageName = options.pageName || APP.pages.jobs.name;
            var pageOptions = options.pageOptions || {};

            EXT_API.AUTH_TOKEN = options.token;
            localStorage.setItem('AUTH_TOKEN', options.token);
            APP.showPage(pageName, pageOptions);
            APP.isAuth = true;
            APP.$logoutBtn.removeClass('hide');
        },
        unauthorize  : function () {
            EXT_API.AUTH_TOKEN = null;
            localStorage.setItem('AUTH_TOKEN', '');
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
    APP.addPage(JobsPage, {name: 'jobs'});
    APP.addPage(JobItemPage, {name: 'job'});
    APP.addPage(JobProfileListPage, {name: 'jobProfiles'});
    APP.addPage(ImportProfilePage, {name: 'importProfile'});
    APP.addPage(ImportJobListPage, {name: 'importJobListPage'});

    APP.run();

    chrome.tabs.query({active: true}, function (tabs) {
        var tabId = tabs[0].id;

        chrome.tabs.onUpdated.addListener(function (_tabId, info, updTab) {
            var evt;

            if (tabId === _tabId && info.status === "complete") {
                evt = 'complete:' + tabId;

                APP.events.trigger(evt, [updTab, info]);
            }
        });

    });

})();
