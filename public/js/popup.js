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

            listHtml = items.map(function (item) {
                return [
                    '<tr class="item" data-id="' + item.id + '">',
                    '<td>',
                    '  <div class="chbWrap checkbox-wrap">',
                    '    <input type="checkbox" class="checkbox" id="checkbox-' + item.id + '">',
                    '    <label for="checkbox-' + item.id + '">',
                    '      <span class="check">',
                    '        <svg class="icon icon-check">',
                    '        <use class="icon-svg" xlink:href="../img/sprite.svg#icon-check"></use>',
                    '      </svg>',
                    '      </span>',
                    '    </label>',
                    '  </div>',
                    '</td>',
                    '<td class="cell-avatar">',
                    '  <div class="avatar">' + item.avatar || '' + '</div>',
                    '</td>',
                    '<td class="jobLanguage cell-job-name">' + item.search + '</td>',
                    '<td class="jobRegion cell-region">' + item.region + '</td>',
                    '<td class="cell-cell-profiles">' + item.profiles || 0 + '</td>',
                    '<td class="cell-settings">',
                    '  <svg class="editJobBtn icon icon-settings">',
                    '    <use class="icon-svg" xlink:href="../img/sprite.svg#icon-settings"></use>',
                    '  </svg>',
                    '</td>',
                    '<td class="cell-delete">',
                    '  <svg class="deleteBtn icon icon-delete">',
                    '    <use class="icon-svg" xlink:href="../img/sprite.svg#icon-delete"></use>',
                    '  </svg>',
                    '</td>',
                    '</tr>'
                ].join('');
            }).join('\n');

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

            this.$inputSearch = this.$el.find('input[name="search"]');
            this.$inputRegion = this.$el.find('input[name="region"]');
            this.$inputLanguage = this.$el.find('input[name="language"]');
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
                search        : this.$inputSearch.val(),
                region        : this.$inputRegion.val(),
                language      : this.$inputLanguage.val(),
                url           : this.$inputUrl.val(),
                importExisting: this.$inputImportExisting.val()
            };
        },

        validate: function (data) {
            if (!data.search && !data.region && !data.language && !data.url) {
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

                if (data.id) {
                    APP.showPage(APP.pages.jobs.name);
                    APP.events.trigger('jobs:update', res);
                } else {
                    APP.showPage(APP.pages.jobs.name, {reset: true});
                    // APP.events.trigger('jobs:create', res);
                }
            });
        },

        renderData: function (data) {
            this.$el.attr('data-id', data.id);

            this.$inputSearch.val(data.search);
            this.$inputRegion.val(data.region);
            this.$inputLanguage.val(data.language);
            this.$inputUrl.val(data.url);
            this.$inputImportExisting.val(data.importExisting);

            this._preData = data;
        }
    });

    var JobProfileListPage = ExtensionPage.extend({
        init: function (options) {
            ExtensionPage.prototype.init.call(this, options);

            //this.parser = new LinkedInParser();
            //console.log('>>> parser', this.parser);

            this.$header = this.$el.find('.jobProfileHeader');
            this.$table = this.$el.find('.table');
            this.$list = this.$el.find('.jobProfileList');
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
                    self.renderItems({items: profiles});
                    self.loader({status: 1}); // Done, hide the progressbar
                    self.$table.removeClass('hide');

                    return; // do not fetch again !!!
                }

                // There are no saved profiles for this jobs, need to fetch data ...
                // open new tab:
                chrome.tabs.create({url: job.url, active: false}, function (tab) {
                    self.loader({message: 'Step 1/2 (Fetch list ...)', status: 0});
                    console.log('tab ' + tab.id + ' load...');

                    // wait until load:
                    chrome.tabs.onUpdated.addListener(function (tabId, info) {
                        if (tabId === tab.id && (info.status === "complete")) {
                            console.log('... complete');

                            // send message to contentScript:
                            chrome.tabs.sendMessage(tab.id, {method: "jobs"}, function (response) {
                                console.log("response: " + JSON.stringify(response));

                                var normalized = self.normalizeProfiles(response.data.profiles);

                                self.storeProfileList(normalized);
                                self.renderItems({items: normalized});
                                self.loader({status: 1}); // Done, hide the progressbar
                                self.$table.removeClass('hide');
                            });
                        }
                    });
                });
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

        fetchAll: function (options, callback) {
            var jobId = options.id;

            async.parallel({
                job: function (cb) {
                    var _options = {
                        id: jobId
                    };

                    EXT_API.fetchJob(_options, function (err, job) {
                        if (err) {
                            return cb(err);
                        }

                        if (!job || !job.id) {
                            return cb('The job was not found');
                        }

                        cb(null, job);
                    });
                },

                profiles: function (cb) {
                    var _options = {
                        job_id: jobId
                    };

                    EXT_API.fetchJobProfiles(_options, function (err, profiles) {
                        if (err) {
                            return cb(err);
                        }

                        cb(null, profiles);
                    });

                    /*var _jobs = [
                        {
                            "link": "/in/synov/",
                            "name": "Nikita Synov",
                            "job" : "Taking Care of Your Business with Innovative Marketing Strategies"
                        },
                        {
                            "link": "#",
                            "name": "LinkedIn Member",
                            "job" : "Program Development Professional"
                        },
                        {
                            "link": "/in/victoroleksuh/",
                            "name": "Victor Oleksuh",
                            "job" : "Looking for Junior PHP/WordPress developer position"
                        },
                        {
                            "link": "#",
                            "name": "LinkedIn Member",
                            "job" : "System administrator - Ergopack LLC"
                        },
                        {
                            "link": "/in/%D1%81%D0%B2%D0%B5%D1%82%D0%BB%D0%B0%D0%BD%D0%B0-%D0%BF%D1%80%D0%BE%D1%86%D0%B5%D0%BD%D0%BA%D0%BE-46418876/",
                            "name": "Светлана Protsenko",
                            "job" : "Senior Marketing Manager  Pilog Internftionfl Group, CIS\n"
                        }
                    ];

                    cb(null, _jobs);*/
                }

            }, function (err, results) {
                if (err) {
                    return callback(err);
                }

                console.log('>>> results', results);
                callback(null, results);
            });
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
            return items.map(function (item, index) {
                var cid = new Date().valueOf() + '_' + index;

                return [
                    '<tr class="item" data-id="' + item.link + '" data-cid="' + cid + '">',

                    // checkbox:
                    '  <td class="cell-checkbox">',
                    '    <div class="checkbox-wrap">',
                    '      <input type="checkbox" class="checkbox" id="checkbox-' + cid + '">',
                    '      <label for="checkbox-' + cid + '">',
                    '        <span class="check">',
                    '          <svg class="icon icon-check">',
                    '            <use class="icon-svg" xlink:href="../img/sprite.svg#icon-check"></use>',
                    '          </svg>',
                    '        </span>',
                    '      </label>',
                    '    </div>',
                    '  </td>',

                    // job avatar:
                    '  <td class="cell-avatar">',
                    '    <div class="avatar">' + item.shortName + '</div>',
                    '  </td>',

                    // profile info:
                    '  <td class="cell-name" title="' + item.name + '">' + item.name + '</td>',
                    '  <td class="cell-job" title="' + item.job + '">' + item.job + '</td>',
                    '  <td class="cell-date">' + item.createdAt + '</td>',
                    '  <td class="cell-status">' + item.status + '</td>',

                    '  <td class="cell-action">',
                    '    <a href="#">',
                    '      <svg class="icon icon-export">',
                    '      <use class="icon-svg" xlink:href="../img/sprite.svg#icon-export"></use>',
                    '        </svg>',
                    '      <span>Export</span>',
                    '    </a>',
                    '  </td>',

                    '  <td class="cell-delete">',
                    '    <svg class="icon icon-delete">',
                    '      <use class="icon-svg" xlink:href="../img/sprite.svg#icon-delete"></use>',
                    '    </svg>',
                    '  </td>',

                    '</tr>'
                ].join('\n');
            }).join('');
        },

        renderItems: function (options) {
            var profiles = options.items;
            var html = this.generateListTemplate(profiles);

            this.$list.html(html);
        },

        renderJob: function (job) {
            var _date = new Date(job.updatedAt);

            this.$header.find('.jobProfileRegion').html(job.region || '');
            this.$header.find('.jobProfileDate').html(_date.toLocaleDateString());

            this.$header.find('.countSuccessful').html(job.count_successful || 0);
            this.$header.find('.countUnSuccessful').html(job.count_unsuccessful || 0);
            this.$header.find('.countPending').html(job.count_pending || 0);
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
        notification : function (options) {
            var message = options.message || 'Some thing went wrong';

            alert(message);
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

})();
