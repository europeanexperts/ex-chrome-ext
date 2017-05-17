'use strict';

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
            console.log('>>> show page %s', this.name);
        },
        hide               : function () {
            this.$el.removeClass('active');
        },
        showValidationError: function (errors) {
            var names = Object.keys(errors);

            APP.notification({type: "error", message: errors[names[0]]});
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
            console.log('>>> on update item', data);
        },

        onSettingsClick: function (e) {
            var $target = $(e.target);
            var id = $target.closest('.item').attr('data-id');
            var data = {
                id: id
            };

            EXT_API.fetchJob(data, function (err, jobData) {
                if (err) {
                    return APP.error(err);
                }

                jobData.id = id;
                jobData.title = 'Settings';

                APP.showPage(APP.pages.job.name, jobData);
            });
        },

        onDeleteItemClick: function (e) {
            var $target = $(e.target);
            var $tr = $target.closest('.item');
            var id = $tr.attr('data-id');
            var ids = [id];
            var self = this;

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
                    '  <div class="checkbox-wrap">',
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
                    '<td class="cell-job-name">' + item.language + '</td>',
                    '<td class="cell-region">' + item.region + '</td>',
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
                this.$saveBtn.val('Save Settings');
                this.$el.attr('data-id', options.id);
                this.renderData(options);
            } else {
                this.$saveBtn.val('Create a Job');
                this.$el.attr('data-id', '');
                this.renderData({});
            }
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

    window.APP = {
        // REQUESTS    : window.EXT_API,
        isAuth           : false,
        events           : $({}),
        history          : [],
        pages            : {},
        currentPage      : null,
        addPage          : function (Page, options) {
            var name = options.name;

            this.pages[name] = new Page(options);
        },
        notification     : function (options) {
            var message = options.message || 'Some thing went wrong';

            alert(message);
        },
        error            : function (e) {
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
        checkExtClassName: function (page) {
            page = page || APP.currentPage;

            if (page.name === APP.pages.login.name || page.name === APP.pages.forgotPassword.name) {
                APP.$extensionBody.addClass('log-in');
            } else {
                APP.$extensionBody.removeClass('log-in');
            }
        },
        showPage         : function (name, options) {
            var page;

            options = options || {};
            page = APP.pages[name];

            console.log('>>> set page', name);

            if (APP.currentPage) {
                APP.currentPage.hide();
            }

            APP.$heading.html(options.title || page.title);
            APP.currentPage = page;
            APP.history.push(page);
            page.show(options);

            APP.checkExtClassName(page);
        },
        authorize        : function (options) {
            EXT_API.AUTH_TOKEN = options.token;
            APP.showPage(APP.pages.jobs.name);
            APP.isAuth = true;
            APP.$logoutBtn.removeClass('hide');
        },
        unauthorize      : function () {
            EXT_API.AUTH_TOKEN = null;
            APP.isAuth = false;
            APP.$logoutBtn.addClass('hide');
            APP.showPage(APP.pages.login.name);
        },
        init             : function () {
            APP.$extensionBody = $('.extensionBody');
            APP.$heading = APP.$extensionBody.find('.heading');
            //APP.$logoutBtn = APP.$extensionBody.find('.logoutBtn');
            APP.$logoutBtn = $('.logoutBtn');
            APP.$extensionBody.find('.prevBtn').on('click', function () {
                var history = APP.history;
                var prevPage;

                if (history.length < 2) {
                    return false;
                }

                APP.history.pop(); // current page;
                prevPage = APP.history.pop();
                APP.showPage(prevPage.name);
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

    APP.showPage('jobs');

})();
